// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const lang = require('lang');
const Q = require('q');

const BaseChannel = require('../base_channel');

var cnt = 0;

const TestChannel = new lang.Class({
    Name: 'TestChannel',
    Extends: BaseChannel,

    _init: function() {
        this.parent();

        cnt++;
        console.log('Created Test channel #' + cnt);

        this._timeout = -1;
    },

    sendEvent: function(event) {
        console.log('Writing data on test channel: ' + JSON.stringify(event));
    },

    _doOpen: function() {
        setTimeout(function() {
            this.emitEvent({"number":42}, true);
        }.bind(this), 0);
        this._timeout = setInterval(function() {
            var event = {"number":42 + Math.floor(Math.random() * 42)};
            this.emitEvent(event, true);
        }.bind(this), 5000);
        return Q();
    },

    _doClose: function() {
        clearInterval(this._timeout);
        this._timeout = -1;
        return Q();
    }
});

function createChannel() {
    return new TestChannel();
}

module.exports.createChannel = createChannel;
module.exports.requiredCapabilities = [];
