(function () {
  'use strict';

  var app = {
    isLoading: true,
    visibleCards: {},
    selectedCities: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };


  /*****************************************************************************
   *test
   * Event listeners for UI elements
   *
   ****************************************************************************/

  document.getElementById('butRefresh').addEventListener('click', function () {
    // Refresh all of the forecasts
    app.updateForecasts();
  });

  document.getElementById('butAdd').addEventListener('click', function () {
    // Open/show the add new city dialog
    app.toggleAddDialog(true);
  });

  document.getElementById('butAddCity').addEventListener('click', function () {
    // Add the newly selected city
    var select = document.getElementById('selectCityToAdd');
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    var label = selected.textContent;
    if (!app.selectedCities) {
      app.selectedCities = [];
    }
    app.getWeatherCurrent(key)
    app.getWeatherForecast(key)
    app.selectedCities.push({ key: key, label: label });
    app.saveSelectedCities();
    app.toggleAddDialog(false);
  });

  document.getElementById('butAddCancel').addEventListener('click', function () {
    // Close the add new city dialog
    app.toggleAddDialog(false);
  });


  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the add new city dialog.
  app.toggleAddDialog = function (visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };

  // Updates a weather card with the latest weather forecast. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateCardCurrentWeather = function (data) {
    var card = app.visibleCards[data.id];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.name;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.id] = card;
    }
      // Verifies the data provide is newer than what's already visible
      // on the card, if it's not bail, if it is, continue and update the
      // time saved in the card
      var cardLastUpdatedElem = card.querySelector('.card-last-updated');
      var cardLastUpdated = cardLastUpdatedElem.textContent;
      if (cardLastUpdated) {
        cardLastUpdated = new Date(cardLastUpdated);
        // Bail if the card has more recent data then the data
        if (data.dt < cardLastUpdated.getTime()) {
          return;
        }
      }

      var localeDate = 'en-US';
      cardLastUpdatedElem.textContent = new Date(data.dt*1000);
      card.querySelector('.description').textContent = data.weather[0].description;
      card.querySelector('.date').textContent = new Date(data.dt * 1000)
        .toLocaleDateString(localeDate, { weekday: 'short', month: 'short', day: 'numeric' });
        var iconCode = data.weather[0].icon;
      card.querySelector('.current .icon').classList.add(app.getIconClass(iconCode));
      card.querySelector('.current .temperature .value').textContent =
        Math.round(data.main.temp);
      var optionsDate = { hour: 'numeric', minute: 'numeric', weekday: 'narrow' };
      card.querySelector('.current .sunrise').textContent = new Date(data.sys.sunrise * 1000)
        // .format('HH:m');
        .toLocaleDateString(localeDate, optionsDate);
      card.querySelector('.current .sunset').textContent = new Date(data.sys.sunset * 1000)
        .toLocaleDateString(localeDate, optionsDate);
      card.querySelector('.current .humidity').textContent =
        Math.round(data.main.humidity) + '%';
      card.querySelector('.current .wind .value').textContent =
        Math.round(data.wind.speed); //mph
      card.querySelector('.current .wind .direction').textContent = data.wind.deg;

    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };

  app.updateCardForecastWeather = function (data) {
    var card = app.visibleCards[data.city.id];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.city.name;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.city.id] = card;
    }

      var nextDays = card.querySelectorAll('.future .oneday');
      var today = new Date();
      today = today.getDay();
      for (var i = 0; i < 7; i++) {
        var nextDay = nextDays[i];
        var daily = data.list[i];
        if (daily && nextDay) {
          nextDay.querySelector('.date').textContent =
            app.daysOfWeek[(i + today) % 7];
          nextDay.querySelector('.icon').classList.add(app.getIconClass(daily.weather[0].icon));
          var maxVal = Math.round(daily.temp.max);
          nextDay.querySelector('.temp-high .value').textContent = maxVal;
          nextDay.querySelector('.temp-low .value').textContent =
            Math.round(daily.temp.min);
        }
      }

    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };


  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  app.getWeatherCurrent = function (key) {
    const unitsType = 'imperial';
    const langRequest = 'en';
    const myAPPID = 'd53bff8f3256eaf090be3c94964b0cb8';

    var url = 'https://api.openweathermap.org/data/2.5/weather?mode=json'
      + '&id=' + key
      + '&units=' + unitsType
      + '&lang=' + langRequest
      + '&APPID=' + myAPPID;
    // http://api.openweathermap.org/data/2.5/weather?mode=json&id=680332&units=metric&lang=en&APPID=d53bff8f3256eaf090be3c94964b0cb8
    // https://query.yahooapis.com/v1/public/yql?format=json&q=select%20*%20from%20weather.forecast%20where%20woeid=2459115

    // TODO add cache logic here
    if ('caches' in window) {
      /*
       * Check if the service worker has already cached this city's weather
       * data. If the service worker has the data, then display the cached
       * data while the app fetches the latest data.
       */
      caches.match(url).then(function (response) {
        if (response) {
          response.json().then(app.updateCardCurrentWeather(results));
        }
      });
    }
    // Fetch the latest data.
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var results = JSON.parse(request.response);
          // results.created = results.dt;
          app.updateCardCurrentWeather(results);
        }
      } else {
        // Return the initial weather forecast since no data is available.
        app.updateCardCurrentWeather(initialWeatherCurrent);
      }
    };
    request.open('GET', url);
    request.send();

  };

  app.getWeatherForecast = function (key) {
    const unitsType = 'imperial';
    const langRequest = 'en';
    const myAPPID = 'd53bff8f3256eaf090be3c94964b0cb8';

    var url_forecast = 'https://api.openweathermap.org/data/2.5/forecast/daily?mode=json'
      + '&id=' + key
      + '&units=' + unitsType
      + '&cnt=' + '7'
      + '&lang=' + langRequest
      + '&APPID=' + myAPPID;
    // http://api.openweathermap.org/data/2.5/forecast/daily?id=5128581&mode=json&units=metric&cnt=14&lang=en&APPID=d53bff8f3256eaf090be3c94964b0cb8

    // TODO add cache logic here
    if ('caches' in window) {
      /*
       * Check if the service worker has already cached this city's weather
       * data. If the service worker has the data, then display the cached
       * data while the app fetches the latest data.
       */
      caches.match(url_forecast).then(function (response) {
        if (response) {
          response.json().then(app.updateForecastCard(results));
        }
      });

    }

    // Fetch the latest FORECAST data.
    var request_forecast = new XMLHttpRequest();
    request_forecast.onreadystatechange = function () {
      if (request_forecast.readyState === XMLHttpRequest.DONE) {
        if (request_forecast.status === 200) {
          var results = JSON.parse(request_forecast.response);
          // results.created = results.dt;
          app.updateCardForecastWeather(results);
        }
      } else {
        // Return the initial weather forecast since no data is available.
        app.updateCardForecastWeather(initialWeatherForecast);
      }
    };
    request_forecast.open('GET', url_forecast);
    request_forecast.send();

  };

  // Iterate all of the cards and attempt to get the latest forecast data
  app.updateForecasts = function () {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function (key) {
      // app.getWeatherCurrent(key)
      app.getWeatherForecast(key)
    });
  };

  // TODO add saveSelectedCities function here
  // Save list of cities to localStorage.
  app.saveSelectedCities = function () {
    var selectedCities = JSON.stringify(app.selectedCities);
    localStorage.selectedCities = selectedCities;
  };

  app.getIconClass = function (weatherCode) {
    // Weather codes: https://developer.yahoo.com/weather/documentation.html#codes
    // weatherCode = parseInt(weatherCode);
    switch (weatherCode) {
      // case 25: // cold
      // case 32: // sunny
      // case 33: // fair (night)
      // case 34: // fair (day)
      // case 36: // hot
      // case 3200: // not available
      case '01d':
      case '01n':
        return 'clear-day';
      // case 0: // tornado
      // case 1: // tropical storm
      // case 2: // hurricane
      // case 6: // mixed rain and sleet
      // case 8: // freezing drizzle
      // case 9: // drizzle
      // case 10: // freezing rain
      // case 11: // showers
      // case 12: // showers
      // case 17: // hail
      // case 35: // mixed rain and hail
      // case 40: // scattered showers
      case '09d':
      case '09n':
      case '10d':
      case '10n':
        return 'rain';
      // case 3: // severe thunderstorms
      // case 4: // thunderstorms
      // case 37: // isolated thunderstorms
      // case 38: // scattered thunderstorms
      // case 39: // scattered thunderstorms (not a typo)
      // case 45: // thundershowers
      // case 47: // isolated thundershowers
      case '11d':
      case '11n':
        return 'thunderstorms';
      // case 5: // mixed rain and snow
      // case 7: // mixed snow and sleet
      // case 13: // snow flurries
      // case 14: // light snow showers
      // case 16: // snow
      // case 18: // sleet
      // case 41: // heavy snow
      // case 42: // scattered snow showers
      // case 43: // heavy snow
      // case 46: // snow showers
      case '13d':
      case '13n':
        return 'snow';
      // case 15: // blowing snow
      // case 19: // dust
      // case 20: // foggy
      // case 21: // haze
      // case 22: // smoky
      case '50d':
      case '50n':
        return 'fog';
      // case 24: // windy
      // case 23: // blustery
        return 'windy';
      // case 26: // cloudy
      // case 27: // mostly cloudy (night)
      // case 28: // mostly cloudy (day)
      // case 31: // clear (night)
      case '03d':
      case '03n':
      case '04d':
      case '04n':
        return 'cloudy';
      // case 29: // partly cloudy (night)
      // case 30: // partly cloudy (day)
      // case 44: // partly cloudy
      case '02d':
      case '02n':
        return 'partly-cloudy-day';
    }
  };

  /*
   * Fake weather data that is presented when the user first uses the app,
   * or when the user has not saved any cities. See startup code for more
   * discussion.
   */
  var initialWeatherCurrent = {
    "coord": {
      "lon": -74.01,
      "lat": 40.71
    },
    "weather": [
      {
        "id": 500,
        "main": "Rain",
        "description": "light rain",
        "icon": "10n"
      }
    ],
    "base": "stations",
    "main": {
      "temp": 34.86,
      "pressure": 1012,
      "humidity": 80,
      "temp_min": 32,
      "temp_max": 37.4
    },
    "visibility": 16093,
    "wind": {
      "speed": 19.46,
      "deg": 340,
      "gust": 11.3
    },
    "dt": 1517566500,
    "sys": {
      "type": 1,
      "id": 1969,
      "message": 0.0038,
      "country": "US",
      "sunrise": 1517573074,
      "sunset": 1517609732
    },
    "id": 5128581,
    "name": "New York",
    "cod": 200
  };

  // var requestJsonForecast = new XMLHttpRequest();
  // requestJsonForecast.open("GET", "initialWeatherForecast.json", false);
  // requestJsonForecast.send(null)
  // var initialWeatherForecast = JSON.parse(requestJsonForecast.responseText)[0];
  var initialWeatherForecast = {
    "city": {
      "id": 5128581,
      "name": "New York",
      "coord": {
        "lon": -74.006,
        "lat": 40.7143
      },
      "country": "US",
      "population": 0
    },
    "cod": "200",
    "message": 0.0848743,
    "cnt": 7,
    "list": [
      {
        "dt": 1517590800,
        "temp": {
          "day": -4.8,
          "min": -8.15,
          "max": -3,
          "night": -8.15,
          "eve": -6.42,
          "morn": -3
        },
        "pressure": 1026.9,
        "humidity": 100,
        "weather": [
          {
            "id": 600,
            "main": "Snow",
            "description": "light snow",
            "icon": "13d"
          }
        ],
        "speed": 6.32,
        "deg": 306,
        "clouds": 12,
        "rain": 0.27,
        "snow": 0.37
      },
      {
        "dt": 1517677200,
        "temp": {
          "day": -3.75,
          "min": -8.98,
          "max": -2.32,
          "night": -2.89,
          "eve": -3.38,
          "morn": -8.98
        },
        "pressure": 1038.44,
        "humidity": 100,
        "weather": [
          {
            "id": 800,
            "main": "Clear",
            "description": "sky is clear",
            "icon": "01d"
          }
        ],
        "speed": 3.91,
        "deg": 231,
        "clouds": 0
      },
      {
        "dt": 1517763600,
        "temp": {
          "day": 1.73,
          "min": -4.28,
          "max": 1.73,
          "night": -4.28,
          "eve": 0.71,
          "morn": -0.88
        },
        "pressure": 1030.41,
        "humidity": 88,
        "weather": [
          {
            "id": 601,
            "main": "Snow",
            "description": "snow",
            "icon": "13d"
          }
        ],
        "speed": 3.77,
        "deg": 209,
        "clouds": 92,
        "rain": 0.69,
        "snow": 4.46
      },
      {
        "dt": 1517850000,
        "temp": {
          "day": 3.31,
          "min": -6.6,
          "max": 3.31,
          "night": -6.6,
          "eve": -2.99,
          "morn": -5.35
        },
        "pressure": 1018.46,
        "humidity": 0,
        "weather": [
          {
            "id": 500,
            "main": "Rain",
            "description": "light rain",
            "icon": "10d"
          }
        ],
        "speed": 3.44,
        "deg": 320,
        "clouds": 22
      },
      {
        "dt": 1517936400,
        "temp": {
          "day": 1.77,
          "min": -2.98,
          "max": 2.75,
          "night": 2.72,
          "eve": 2.75,
          "morn": -2.98
        },
        "pressure": 1024.63,
        "humidity": 0,
        "weather": [
          {
            "id": 601,
            "main": "Snow",
            "description": "snow",
            "icon": "13d"
          }
        ],
        "speed": 2.07,
        "deg": 160,
        "clouds": 100,
        "rain": 12.05,
        "snow": 3.87
      },
      {
        "dt": 1518022800,
        "temp": {
          "day": 1.9,
          "min": -2.75,
          "max": 2.46,
          "night": -2.75,
          "eve": 0.82,
          "morn": 2.46
        },
        "pressure": 1013.94,
        "humidity": 0,
        "weather": [
          {
            "id": 502,
            "main": "Rain",
            "description": "heavy intensity rain",
            "icon": "10d"
          }
        ],
        "speed": 4.06,
        "deg": 5,
        "clouds": 100,
        "rain": 20.85
      },
      {
        "dt": 1518109200,
        "temp": {
          "day": -2.44,
          "min": -7.17,
          "max": -2.44,
          "night": -7.17,
          "eve": -3.68,
          "morn": -3.24
        },
        "pressure": 1022.46,
        "humidity": 0,
        "weather": [
          {
            "id": 601,
            "main": "Snow",
            "description": "snow",
            "icon": "13d"
          }
        ],
        "speed": 3.01,
        "deg": 356,
        "clouds": 100,
        "snow": 5.69
      }
    ]
  };

  // TODO uncomment line below to test app with fake data
  // app.updateForecastCard(initialWeatherForecast);

  /************************************************************************
   *
   * Code required to start the app
   *
   * NOTE: To simplify this codelab, we've used localStorage.
   *   localStorage is a synchronous API and has serious performance
   *   implications. It should not be used in production applications!
   *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
   *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
   ************************************************************************/

  // TODO add startup code here
  app.selectedCities = localStorage.selectedCities;
  if (app.selectedCities) {
    app.selectedCities = JSON.parse(app.selectedCities);
    app.selectedCities.forEach(function (city) {
      app.getWeatherCurrent(city.key)
      app.getWeatherForecast(city.key)
    });
  } else {
    /* The user is using the app for the first time, or the user has not
     * saved any cities, so show the user some fake data. A real app in this
     * scenario could guess the user's location via IP lookup and then inject
     * that data into the page.
     */
    app.updateCardCurrentWeather(initialWeatherCurrent)
    app.updateCardForecastWeather(initialWeatherForecast);
    app.selectedCities = [
      { key: initialWeatherForecast.id, label: initialWeatherForecast.name }
    ];
    app.saveSelectedCities();
  }

  // TODO add service worker code here
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./service-worker.js')
      .then(function () { console.log('Service Worker Registered'); });
  }
})();
