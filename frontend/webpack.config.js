const path = require('path')
const HtmlWebpack = require('html-webpack-plugin')
const CopyWebpack = require('copy-webpack-plugin')
const { execSync } = require('child_process')

// Get CloudFormation parameters
const cfParams = Object.fromEntries(
  execSync('bash get-cf-params.sh', { encoding: 'utf-8' })
    .trim()
    .split('\n')
    .map(line => {
      const [key, value] = line.split('=')
      return [key, JSON.stringify(value.trim())]
    })
)

module.exports = {
  entry: {
    about: {
      import: './src/scripts/about.js',
      dependOn: 'shared'
    },
    admin: {
      import: './src/scripts/admin.js',
      dependOn: 'shared'
    },
    login: {
      import: require.resolve('blr-shared-frontend/dist/login.js')
    },
    picks: {
      import: './src/scripts/picks.js',
      dependOn: 'shared'
    },
    scoreboard: {
      import: './src/scripts/scoreboard.js',
      dependOn: 'shared'
    },
    navonly: {
      import: './src/scripts/navonly.js',
      dependOn: 'shared'
    },
    shared: './src/scripts/shared.js'
  },
  
  mode: 'development',
  devtool: 'eval-source-map',
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'scripts/[name].bundle.js'
  },
  
  plugins: [
    new HtmlWebpack({
      title: 'About',
      filename: 'about.html',
      template: './src/about.html',
      chunks: ['shared', 'navonly']
    }),
    new HtmlWebpack({
      title: 'Admin',
      filename: 'admin.html',
      template: './src/admin.html',
      chunks: ['shared', 'admin']
    }),
    new HtmlWebpack({
      title: "Login",
      filename: "login.html",
      template: require.resolve('blr-shared-frontend/src/login.html'),
      chunks: ["navonly", "login"],
      inject: true
    }),
    new HtmlWebpack({
      title: 'Picks',
      filename: 'picks.html',
      template: './src/picks.html',
      chunks: ['shared', 'picks']
    }),
    new HtmlWebpack({
      title: 'Scoreboard',
      filename: 'index.html',
      template: './src/index.html',
      chunks: ['shared', 'scoreboard']
    }),
    new CopyWebpack({
      patterns: [{
        from: './src/images',
        to: 'assets'
      }]
    })
  ],
  
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.js$/,
        use: [{
          loader: 'string-replace-loader',
          options: {
            multiple: Object.entries(cfParams).map(([key, value]) => ({
              search: key,
              replace: value,
              flags: 'g'
            }))
          }
        }]
      }
    ]
  }
}
