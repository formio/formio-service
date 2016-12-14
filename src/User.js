module.exports = function (formio) {
  var User = function (email, pass) {
    this.formio = formio;
    this.token = '';
    this.email = email;
    this.pass = pass;
    this.user = null;
  };

  /**
   * Register a new user
   * @param user
   * @param form
   * @returns {PromiseLike<TResult>|Promise<TResult>|Promise.<TResult>}
   */
  User.prototype.register = function(user, form) {
    form = form || '/user/register';
    return formio.request('post', formio.config.formio + form + '/submission', {
      data: user
    }).then(function (res) {
      this.user = res.body;
      this.token = res.headers['x-jwt-token'];
      return this;
    }.bind(this));
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
      this.user = res.body;
      this.token = res.headers['x-jwt-token'];
      return this;
    }.bind(this));
  };

  // Create an alias for login.
  User.prototype.login = User.prototype.authenticate;
  return User;
};
