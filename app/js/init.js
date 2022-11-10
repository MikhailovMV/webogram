;(function initApplication () {
  // Prevent click-jacking
  try {
    if (window == window.top || window.chrome && chrome.app && chrome.app.window) {
      document.documentElement.style.display = 'block'
    } else {
      top.location = self.location
    }
  } catch (e) {console.error('CJ protection', e) }

  var classes = [
    Config.Navigator.osX ? 'osx' : 'non_osx',
    Config.Navigator.msie ? 'msie' : 'non_msie',
    Config.Navigator.retina ? 'is_2x' : 'is_1x'
  ]
  if (Config.Modes.ios_standalone) {
    classes.push('ios_standalone')
  }
  $(document.body).addClass(classes.join(' '))

  ConfigStorage.get('layout_selected', 'i18n_locale', 'kz_version', function (params) {
    var layout = params[0]
    var locale = params[1]
    var kzVersion = params[2]
    var defaultLocale = 'en-us'
    var bootReady = {
      dom: false,
      i18n_ng: false,
      i18n_messages: false,
      i18n_fallback: false,
      migration_check: false
    }
    if ('K' !== kzVersion && 'Z' !== kzVersion) {
      kzVersion = false
    }
    if ('web.telegram.org' !== location.hostname ||
        Config.Modes.test ||
        Config.Modes.ios_standalone ||
        location.search.indexOf('legacy=1') != -1) {
      bootReady.migration_check = true
    } else {
      if (kzVersion) {
        location.href = 'https://web.telegram.org/' + kzVersion.toLowerCase() + '/'
        return
      }
      $.getJSON('https://telegram.org/webogram_migrate').success(function(result) {
        kzVersion = result.kz_version
        if ('K' === kzVersion || 'Z' === kzVersion) {
          ConfigStorage.set({
            kz_version: kzVersion
          })
          location.href = 'https://web.telegram.org/' + kzVersion.toLowerCase() + '/'
          return
        } else {
          bootReady.migration_check = true
        }
      })
    }
    var checkReady = function checkReady () {
      var i
      var ready = true
      for (i in bootReady) {
        if (bootReady.hasOwnProperty(i) && bootReady[i] === false) {
          ready = false
          break
        }
      }
      if (ready) {
        bootReady.boot = false
        angular.bootstrap(document, ['myApp'])
      }
    }

    if (Config.Modes.force_mobile) {
      layout = 'mobile'
    }
    else if (Config.Modes.force_desktop) {
      layout = 'desktop'
    }

    switch (layout) {
      case 'mobile':
        Config.Mobile = true
        break
      case 'desktop':
        Config.Mobile = false
        break
      default:
        var width = $(window).width()
        Config.Mobile = Config.Navigator.mobile || width > 10 && width < 480
        break
    }
    $('head').append(
      '<link rel="stylesheet" href="css/' + (Config.Mobile ? 'mobile.css' : 'desktop.css') + '" />'
    )

    if (!locale) {
      locale = (navigator.language || '').toLowerCase()
      locale = Config.I18n.aliases[locale] || locale
    }
    for (var i = 0; i < Config.I18n.supported.length; i++) {
      if (Config.I18n.supported[i] == locale) {
        Config.I18n.locale = locale
        break
      }
    }
    bootReady.i18n_ng = Config.I18n.locale == defaultLocale // Already included

    $.getJSON('js/locales/' + Config.I18n.locale + '.json').success(function (json) {
      Config.I18n.messages = json
      bootReady.i18n_messages = true
      if (Config.I18n.locale == defaultLocale) { // No fallback, leave empty object
        bootReady.i18n_fallback = true
      }
      checkReady()
    })

    if (Config.I18n.locale != defaultLocale) {
      $.getJSON('js/locales/' + defaultLocale + '.json').success(function (json) {
        Config.I18n.fallback_messages = json
        bootReady.i18n_fallback = true
        checkReady()
      })
    }

    $(document).ready(function () {
      bootReady.dom = true
      if (!bootReady.i18n_ng) { // onDOMready because needs to be after angular
        $('<script>').appendTo('body')
          .on('load', function () {
            bootReady.i18n_ng = true
            checkReady()
          })
          .attr('src', 'vendor/angular/i18n/angular-locale_' + Config.I18n.locale + '.js')
      } else {
        checkReady()
      }
    })
  })
})()
