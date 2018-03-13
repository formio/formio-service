The Form.IO Service Library
========================
This library allows you to interface with the Form.IO API from within a Node.js application. Below is an example,
of how this library can be used to retrieve all the submissions within a certain form.

```
var formio = require('formio-service')();
var Form = formio.Form;

// First authenticate.
formio.authenticate('test@example.com', 'password').then(function() {

    // Create a new form instance.
    var form = new Form('https://myapp.form.io/user');

    // Iterate through all the submissions.
    form.eachSubmission(function(submission) {

        // Console log the submissions.
        console.log(submission);
    });
});
```

Using an API key
----------------
You can also use a Form.io API key to access the API's without needing to login.

```
var formio = require('formio-service')({
  key: '[YOUR_API_KEY]'
});
var Form = formio.Form;

// Create a new form instance.
var form = new Form('https://myapp.form.io/user');

// Iterate through all the submissions.
form.eachSubmission(function(submission) {

  // Console log the submissions.
  console.log(submission);
});
```
