var util = require('./util');
var User = null;
module.exports = function (config) {
  User = function (email, pass) {
    this.token = '';
    this.email = email;
    this.pass = pass;
  };

  /**
   * Authenticate a new user.
   * @returns {Request}
   */
  User.prototype.authenticate = function (form) {
    form = form || '/user/login';
    return util.request('post', config.formio + form + '/submission', {
      data: {
        'email': this.email,
        'password': this.pass
      }
    }).then(function (res) {
      this.token = res.headers['x-jwt-token'];
    }.bind(this));
  };

  return User;
};