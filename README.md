# ![navitia playground](https://rawgithub.com/CanalTP/navitia-playground/master/img/n_playground.svg) [![Build status](https://travis-ci.org/CanalTP/navitia-playground.svg?branch=master)](https://travis-ci.org/CanalTP/navitia-playground)

Web UI for the [navitia](https://github.com/CanalTP/navitia) API. You can get a token [here](http://www.navitia.io) and then use this UI [here](http://canaltp.github.io/navitia-playground/).

## Screenshots

![Request](screenshots/request.png) ![Response](screenshots/response.png)

## Setting your dev environment to contribute

Installing the dependencies:
* Check first your node version with `node --version` and get a recent version if needed (should work with node 4.4 and 6.0). [Ubuntu/Debian installation](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions).
* `sudo npm install gulp -g && sudo npm install bower -g && npm install && bower install`

You can optionally install packages with [yarn](https://yarnpkg.com/en/) instead of npm
* `sudo npm install -g gulp yarn bower && yarn install && bower install`

To launch:
* `gulp dev`

## License

This project is under the [MIT license](LICENSE). See the [bower file](bower.json) for the running dependencies and the [npm file](package.json) for dev dependencies.
