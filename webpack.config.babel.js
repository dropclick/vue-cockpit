var _path = require('path');

var include = (0, _path.join)(__dirname, 'src');

exports.default = {
    entry: './src/index',
    output: {
        path: (0, _path.join)(__dirname, 'dist'),
        libraryTarget: 'umd',
        library: 'viewCockpit'
    },
    devtool: 'source-map',
    module: {
        loader: [{ test: /\.js$/, loader: 'babel', include: include }]
    }
};