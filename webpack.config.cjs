const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  devtool: isProduction ? false : 'source-map',
  
  entry: {
    background: './src/background/background.js',
    content: './src/content/content.js',
    settings: './src/settings/settings.js'
  },
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name]/[name].js',
    clean: true
  },
  
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  browsers: ['Chrome >= 88', 'Firefox >= 78', 'Opera >= 74']
                }
              }]
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]'
        }
      }
    ]
  },
  
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'src/manifest.json',
          to: 'manifest.json'
        },
        {
          from: 'src/settings/settings.html',
          to: 'settings/settings.html'
        },
        {
          from: 'src/settings/settings.css',
          to: 'settings/settings.css'
        },
        {
          from: 'src/content/content.css',
          to: 'content/content.css'
        },
        {
          from: 'src/assets',
          to: 'assets',
          noErrorOnMissing: true
        }
      ]
    })
  ],
  
  optimization: {
    minimize: isProduction
  },
  
  // Watch configuration for development
  watchOptions: {
    ignored: /node_modules/,
    poll: 1000
  }
}; 