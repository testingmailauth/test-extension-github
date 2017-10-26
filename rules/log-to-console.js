function (user, context, callback) {
  console.log(JSON.stringify({ user: user, context: context }, null, 2));
  //test
  callback(null, user, context);
}
