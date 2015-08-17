/**
 * Created by Alejandro on 8/14/2015.
 */
var express = require('express');
var router = express.Router();
var Imap = require('imap'),
    inspect = require('util').inspect;

var config = require('../login');
//==============IMAP=============
/**
 * Created by Alejandro on 8/14/2015.
 */
var messages = {};
var mimeDiv = {};

console.log(config);

var imap = new Imap(config);

function addMime(attName){
    var mime;
    mime =  attName.slice(-3);

    if (mimeDiv.hasOwnProperty(mime)){
        mimeDiv[mime] += 1;
    }
    else{
        mimeDiv[mime] =1;
    }

}

function findAttachmentParts(struct, attachments) {
    attachments = attachments ||  [];
    for (var i = 0, len = struct.length; i < len; ++i) {
        if (Array.isArray(struct[i])) {
            findAttachmentParts(struct[i], attachments);
        } else {
            if (struct[i].disposition && ['INLINE', 'ATTACHMENT'].indexOf(struct[i].disposition.type) > -1) {
                attachments.push(struct[i]);
            }
        }
    }
    return attachments;
}

function openInbox(cb) {
    imap.openBox('INBOX', true, cb);
}
//Read Messages
imap.once('ready', function () {
    console.log('connected ... ');
    imap.openBox('INBOX', true, function (err, box) {

        // get all unseen mails since some time
        imap.search(['SEEN'], function (err, results) {
            var read = results.length;
            messages.read = read;
            console.log(messages.read);
        });

    });
});

//UnRead Messages
imap.once('ready', function () {
    console.log('connected ... ');
    imap.openBox('INBOX', true, function (err, box) {

        // get all unseen mails since some time
        imap.search(['UNSEEN'], function (err, results) {
            var unread = results.length;
            messages.unread=unread;
            console.log(messages.unread);
        });

    });
});
//Attachments Messages
imap.once('ready', function() {
    console.log('connected ... ');
    var msgWithAtt=0;
    var msgNoAtt=0;
    openInbox(function(err, box) {
        if (err) throw err;
        var f = imap.seq.fetch('1:*', {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
            struct: true
        });
        f.on('message', function(msg, seqno) {
            //console.log('Message #%d', seqno);
            //var prefix = '(#' + seqno + ') ';

            msg.on('body', function(stream, info) {
                //var buffer = '';
                //stream.on('data', function(chunk) {
                  //  buffer += chunk.toString('utf8');
                //});
                //stream.once('end', function() {
                //    console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
                //});
            });
            msg.once('attributes', function(attrs) {
                var attachments = findAttachmentParts(attrs.struct);

                if (attachments.length>0){
                    msgWithAtt++;
                }
                else{
                    msgNoAtt++;
                }
                //console.log(prefix + 'Has attachments: %d', attachments.length);
                for (var i = 0, len=attachments.length ; i < len; ++i) {
                    var attachment = attachments[i];

                    //console.log(prefix + 'Fetching attachment %s', attachment.params.name);
                    addMime(attachment.params.name);
                }
                messages.mimes = mimeDiv;
                messages.withAtt = msgWithAtt;
                messages.noAtt = msgNoAtt;
            });
            msg.once('end', function() {
                //console.log(prefix + 'Finished email');
            });
        });
        f.once('error', function(err) {
            console.log('Fetch error: ' + err);
        });
        f.once('end', function() {
            console.log('Done fetching all messages!');
            imap.end();
        });
    });
});

imap.once('error',function(err){
    console.log('From Alex error handler'+err);
});
imap.once('end', function() {
    console.log('Connection ended');
});
//======================IMAP=============

/* GET home page. */
router.get('/', function(req, res, next) {
    //console.log('entra server get'+messages);
    imap.connect();
    res.status(200).json(messages);
});

module.exports = router;

