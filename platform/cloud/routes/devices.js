// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Q = require('q');
const express = require('express');
const passport = require('passport');

var user = require('../util/user');
var EngineManager = require('../enginemanager');

var router = express.Router();

router.get('/', user.redirectLogIn, function(req, res, next) {
    if (req.query.class && ['online', 'physical'].indexOf(req.query.class) < 0) {
        res.status(404).render('error', { page_title: "ThingEngine - Error",
                                          message: "Invalid device class" });
        return;
    }

    var online = req.query.class === 'online';

    EngineManager.get().getEngine(req.user.id).then(function(engine) {
        return engine.devices.getAllDevices();
    }).then(function(devices) {
        return Q.all(devices.map(function(d) {
            return Q.all([d.uniqueId, d.name, d.description, d.checkAvailable(),
                          d.hasKind('online-account'), d.hasKind('thingengine')])
                .spread(function(uniqueId, name, description, available, isOnlineAccount, isThingEngine) {
                    return { uniqueId: uniqueId, name: name || "Unknown device",
                             description: description || "Description not available",
                             available: available,
                             isOnlineAccount: isOnlineAccount,
                             isThingEngine: isThingEngine };
                });
        }));
    }).then(function(devinfo) {
        devinfo = devinfo.filter(function(d) {
            if (d.isThingEngine)
                return false;

            if (online)
                return d.isOnlineAccount;
            else
                return !d.isOnlineAccount;
        });

        res.render('devices_list', { page_title: 'ThingEngine - configured devices',
                                     csrfToken: req.csrfToken(),
                                     onlineAccounts: online,
                                     devices: devinfo });
    }).catch(function(e) {
        res.status(400).render('error', { page_title: "ThingEngine - Error",
                                          message: e.message });
    }).done();
});

router.get('/create', user.redirectLogIn, function(req, res, next) {
    if (req.query.class && ['online', 'physical'].indexOf(req.query.class) < 0) {
        res.status(404).render('error', { page_title: "ThingEngine - Error",
                                          message: "Invalid device class" });
        return;
    }

    var online = req.query.class === 'online';

    res.render('devices_create', { page_title: 'ThingEngine - configure device',
                                   csrfToken: req.csrfToken(),
                                   onlineAccounts: online,
                                 });
});

router.post('/create', user.requireLogIn, function(req, res, next) {
    if (req.query.class && ['online', 'physical'].indexOf(req.query.class) < 0) {
        res.status(404).render('error', { page_title: "ThingEngine - Error",
                                          message: "Invalid device class" });
        return;
    }

    EngineManager.get().getEngine(req.user.id).then(function(engine) {
        var devices = engine.devices;

        if (typeof req.body['kind'] !== 'string' ||
            req.body['kind'].length == 0)
            throw new Error("You must choose one kind of device");

        delete req.body['_csrf'];
        return devices.loadOneDevice(req.body, true);
    }).then(function() {
        res.redirect('/devices?class=' + (req.query.class || 'physical'));
    }).catch(function(e) {
        res.status(400).render('error', { page_title: "ThingEngine - Error",
                                          message: e.message });
    }).done();
});

// special case google because we have login with google
router.get('/oauth2/google-account', user.redirectLogIn, passport.authorize('google', {
    scope: (['openid','profile','email',
             'https://www.googleapis.com/auth/fitness.activity.read',
             'https://www.googleapis.com/auth/fitness.location.read',
             'https://www.googleapis.com/auth/fitness.body.read']
            .join(' ')),
    failureRedirect: '/devices?class=online',
    successRedirect: '/devices?class=online'
}));

router.get('/oauth2/:kind', user.redirectLogIn, function(req, res, next) {
    var kind = req.params.kind;

    EngineManager.get().getEngine(req.user.id).then(function(engine) {
        return engine.devices.factory;
    }).then(function(devFactory) {
        return devFactory.runOAuth2();
    }).then(function() {
        res.redirect('/devices?class=online');
    }).catch(function(e) {
        res.status(400).render('error', { page_title: "ThingEngine - Error",
                                          message: e.message });
    }).done();
});

module.exports = router;
