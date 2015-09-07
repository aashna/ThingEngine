// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Q = require('q');
const lang = require('lang');
const child_process = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const url = require('url');

const user = require('./model/user');
const db = require('./util/db');

var _instance = null;

const EngineManager = new lang.Class({
    Name: 'EngineManager',

    _init: function(frontend) {
        this._runningProcesses = {};
        this._frontend = frontend;

        _instance = this;
    },

    _runUser: function(userId, cloudId, authToken) {
        var runningProcesses = this._runningProcesses;
        var frontend = this._frontend;

        return Q.nfcall(fs.mkdir, './' + cloudId)
            .catch(function(e) {
                if (e.code !== 'EEXIST')
                    throw e;
            })
                .then(function() {
                    return Q.all([Q.nfcall(fs.open, './' + cloudId + '/out.log', 'a'),
                                  Q.nfcall(fs.open, './' + cloudId + '/err.log', 'a')])
                })
            .spread(function(stdout, stderr) {
                var env = {};
                for (var name in process.env)
                    env[name] = process.env[name];
                env.CLOUD_ID = cloudId;
                env.AUTH_TOKEN = authToken;
                console.log('Spawning child for user ' + userId);
                var child = child_process.fork(path.dirname(module.filename)
                                               + '/instance/runengine', [],
                                               { cwd: './' + cloudId,
                                                 stdio: ['ignore',stdout,stderr],
                                                 env: env });
                fs.close(stdout);
                fs.close(stderr);

                var closed = false;
                child.on('error', function(error) {
                    console.error('Child with ID ' + userId + ' reported an error: ' + error);
                    closed = true;
                });
                child.on('exit', function(code, signal) {
                    if (code !== 0)
                        console.error('Child with ID ' + userId + ' exited with code ' + code);

                    delete runningProcesses[userId];
                });
                runningProcesses[userId] = child;

                frontend.registerWebSocketEndpoint('/ws/' + cloudId, function(req, socket, head) {
                    if (closed)
                        return 500; // Internal Server Error

                    // Note: both sockets must have allowHalfOpen: true for this to work
                    // (this is true of sockets created by http.createServer() and
                    // https.createServer())
                    var pipe = net.Socket({ allowHalfOpen: true });
                    pipe.connect('./' + cloudId + '/websocket');
                    // Write the headers again
                    var parsed = url.parse(req.url);
                    pipe.write('UPGRADE ' + parsed.path + ' HTTP/' + req.httpVersion + '\r\n');
                    for (var header in req.rawHeaders)
                        pipe.write(header + ': ' + req.rawHeaders[header] + '\r\n');
                    pipe.write('\r\n');
                    pipe.write(head);
                    // .pipe() is a badly named splice(2)
                    // note that encryption/decryption happens here, as we
                    // pump the data from socket into pipe, and pump the
                    // data from pipe into socket
                    socket.pipe(pipe);
                    pipe.pipe(socket);

                    // Note: 101 is a sentinel value that the frontend need not send a HTTP
                    // response. It does not mean we actually sent 101 (ie, completed the handshake)
                    // but the WebSocketServer code in the engine will take care of that
                    // Or that kill the connection
                    return 101; // Switching Protocols
                });
            });
    },

    start: function() {
        var self = this;
        return db.withClient(function(client) {
            return user.getAll(client).then(function(rows) {
                return Q.all(rows.map(function(r) {
                    return self._runUser(r.id, r.cloud_id, r.auth_token);
                }));
            });
        });
    },

    startUser: function(userId, cloudId, authToken) {
        console.log('Requested start of user ' + userId);
        return this._runUser(userId, cloudId, authToken);
    },

    stop: function() {
        for (var userId in this._runningProcesses) {
            var child = this._runningProcesses[userId];
            child.kill();
        }
    },
});

EngineManager.get = function() {
    return _instance;
};

module.exports = EngineManager;
