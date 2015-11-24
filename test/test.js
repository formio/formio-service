var assert = require('assert');
var config = require('./config');
var template = require('./project.json');
var formio = require('../Formio')({
    formio: 'http://formio.' + config.server,
    api: 'http://api.' + config.server
});
var project = null;
var userForm = null;
describe('Project Tests', function() {
    it('Should be able to authenticate a user.', function(done) {
        formio.authenticate(config.user, config.pass).then(function() {
            assert(!!formio.currentUser.token, 'No user token found');
            done();
        }).catch(done);
    });

    it('Should be able to create a Project.', function(done) {
        project = new formio.Project();
        project.create({
            title: 'Test Project',
            template: template
        }).then(function() {
            assert(!!project.project.name, 'The project name was not created.');
            done();
        }).catch(done);
    });

    it('Should have created some Forms.', function(done) {
        project.forms().then(function(result) {
            assert.equal(result.body.length, 5);
            done();
        }).catch(done);
    });

    it('Should be able to retrieve a single form.', function(done) {
        project.form('user').then(function(form) {
            userForm = form;
            assert(form.form, 'The form was not found.');
            assert.equal(form.form.name, 'user');
            done();
        }).catch(done);
    });

    it('Should be able to bind to a Project via websockets.', function(done) {
        project.bind('user', 'POST', function(err, request) {
            assert(!!request, 'There should be a request object.');
            assert.equal(request.body.data.email, 'test@example.com');
            assert.equal(request.body.data.password, '123testing');
            project.close();
            done(err);
        }).then(function() {
            userForm.submit({
                data: {
                    email: 'test@example.com',
                    password: '123testing'
                }
            }).catch(done);
        }).catch(done);
    });

    it('Should be able to modify the request being sent.', function(done) {
        project.bind('user', 'POST', function(err, req, res) {
            assert(!!req, 'There should be a request object.');
            assert.equal(req.body.data.email, 'test2@example.com');
            assert.equal(req.body.data.password, '123testing');
            req.body.data.email = 'hello@example.com';

            // Send the response back with modified body.
            res(req).then(function(res) {
                assert.equal(res.body.data.email, 'hello@example.com');
            }).catch(done);
        }, true).then(function() {
            userForm.submit({
                data: {
                    email: 'test2@example.com',
                    password: '123testing'
                }
            }).then(function(res) {
                assert.equal(res.body.data.email, 'hello@example.com');
                done();
            }).catch(done);
        }).catch(done);
    });
});

describe('Form Tests', function() {
    it('Should be able to load an existing form.', function(done) {
        var form = new formio.Form(userForm.url);
        form.load().then(function() {
            assert(form.form, 'The Form was now loaded');
            assert.equal(form.form.name, 'user');
            assert(form.form._id, 'The form was not found.');
            done();
        });
    });
});

describe('Project Delete', function() {
    it('Should be able to delete the Project', function(done) {
        project.delete().then(function() {
            assert(true, 'The test did not pass.');
            done();
        }).catch(done);
    });
});
