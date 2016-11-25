module.exports = function (formio) {
  var User = function (email, pass) {
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
    return formio.request('post', formio.config.formio + form + '/submission', {
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
