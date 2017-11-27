function login (username, password, callback) {
  var connection = sqlserver.connect({
    userName:  'YOUR_USER@YOUR_SERVER.database.windows.net',
    password:  'YOUR_PASS',
    server:    'YOUR_SERVER.database.windows.net',
    options: {
      database:  'YOUR_DATABASE_NAME',
      encrypt: true
    }
  });

  connection.on('debug', function(text) {
    // if you have connection issues, uncomment this to get more detailed info
    //console.log(text);
  }).on('errorMessage', function(text) {
    // this will show any errors when connecting to the SQL database or with the SQL statements
    console.log(JSON.stringify(text));
  });

  connection.on('connect', function (err) {
    if (err) {
      return callback(err);
    }
    getMembershipUser(username, function(err, user) {
      if (err) {
        return callback(err); // this will return a 500
      }
      if (!user.profile) {
        return callback(); // this will return a 401
      }

      validatePassword(password, user.password.password, function(err, isValid) {
        if (!isValid) {
          return callback(); // unauthorized
        }

        callback(null, user.profile);
      });


    });
  });


  // Membership Provider implementation used on Microsoft.AspNet.Providers NuGet

  /**
   * getMembershipUser
   *
   * This function gets a username or email and returns a user info, password hashes and salt
   *
   * @usernameOrEamil   {[string]}    the username or email, the method will do a query
   *                                  on both with an OR
   * @callback          {[Function]}  first argument will be the Error if any, and second
   *                                  argument will be a user object
   */
  function getMembershipUser(usernameOrEmail, callback) {
    var user = {};
    var query =
      'SELECT webpages_Membership.UserId, UserName, UserProfile.UserName, Password from webpages_Membership ' +
      'INNER JOIN UserProfile ON UserProfile.UserId = webpages_Membership.UserId ' +
      'WHERE UserProfile.UserName = @Username';

    var getMembershipQuery = new sqlserver.Request(query, function (err, rowCount) {
      if (err) {
        return callback(err);
      }

      if (rowCount < 1) {
        return callback();
      }

      callback(null, user);
    });

    getMembershipQuery.addParameter('Username', sqlserver.Types.VarChar, usernameOrEmail);

    getMembershipQuery.on('row', function (fields) {
      user.profile = {
        user_id:      fields.UserId.value,
        nickname:     fields.UserName.value,
        email:        fields.UserName.value,
      };

      user.password = {
        password: fields.Password.value
      };
    });

    connection.execSql(getMembershipQuery);
  }

  function fixedTimeComparison(a, b) {
    var mismatch = (a.length === b.length ? 0 : 1);
    if (mismatch) {
      b = a;
    }

    for (var i = 0, il = a.length; i < il; ++i) {
      var ac = a.charCodeAt(i);
      var bc = b.charCodeAt(i);
      mismatch += (ac === bc ? 0 : 1);
    }

    return (mismatch === 0);
  }


  /**
   * validatePassword
   *
   * This function gets the password entered by the user, and the original password
   * hash and salt from database and performs an HMAC SHA256 hash.
   *
   * @password      {[string]}      the password entered by the user
   * @originalHash  {[string]}      the original password hashed from the database
   *                                (including the salt).
   * @return        {[bool]}        true if password validates
   */
  function validatePassword(password, originalHash, callback) {
    var iterations = 1000;
    var hashBytes = new Buffer(originalHash, 'base64');
    var salt = hashBytes.slice(1, 17).toString('binary');
    var hash = hashBytes.slice(17, 49);
    crypto.pbkdf2(password, salt, iterations, hash.length, function(err, hashed) {
      if (err) {
        return callback(err);
      }
      var hashedBase64 = new Buffer(hashed, 'binary').toString('base64');

      var isValid = fixedTimeComparison(hash.toString('base64'), hashedBase64);
      return callback(null, isValid);

    });
  }
}
