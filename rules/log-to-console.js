function (user, context, callback) {
  console.log(JSON.stringify({ user: user, context: context }, null, 2));
  //test
  //test
  //test
  //config
  callback(null, user, context);
}
