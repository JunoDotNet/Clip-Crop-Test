const rules = require('./webpack.rules');

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

module.exports = {
  // ...
  module: {
    rules: [
      {
        test: /\.jsx?$/,          // ✅ Matches .js and .jsx
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']  // ✅ So imports don’t need .jsx
  }
};
