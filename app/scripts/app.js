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
   *
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

      var locale = 'en-US';
      var offsetCityMills = -5 * 3600 * 1000;   // NewYork delay to UTC 
      var offsetDeviceMills =  new Date().getTimezoneOffset() * 60 * 1000 ;

      cardLastUpdatedElem.textContent = new Date(data.dt*1000);
      card.querySelector('.description').textContent = data.weather[0].description;
      card.querySelector('.date').textContent = new Date()
        .toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
        var iconCode = data.weather[0].icon;
      card.querySelector('.current .icon').classList.add(app.getIconClass(iconCode));
      card.querySelector('.current .temperature .value').textContent =
        Math.round(data.main.temp);
      var options = { hour: 'numeric', minute: 'numeric' };
      card.querySelector('.current .sunrise').textContent = new Date(data.sys.sunrise * 1000 + offsetCityMills + offsetDeviceMills) 
        .toLocaleTimeString(locale, options);
      card.querySelector('.current .sunset').textContent = new Date(data.sys.sunset * 1000 + offsetCityMills + offsetDeviceMills)
        .toLocaleTimeString(locale, options);
      card.querySelector('.current .humidity').textContent =
        Math.round(data.main.humidity) + '%';
      card.querySelector('.current .wind .value').textContent =
        Math.round(data.wind.speed); //mph
      card.querySelector('.current .wind .direction').textContent = app.getWindDirection(data.wind.deg);

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

  app.getWindDirection = function(degrees){
    if (degrees >= 337.5 || degrees < 22.5) {
        return 'N';                                     //N
    } else if (degrees >= 22.5 && degrees < 67.5) {
       return 'NE';
    } else if (degrees >= 67.5 && degrees < 112.5) {
        return 'E';                                     //"E";
    } else if (degrees >= 112.5 && degrees < 157.5) {
        return 'SE';     //"SE";
    } else if (degrees >= 157.5 && degrees < 202.5) {
      return 'S';                                     //"S";
    } else if (degrees >= 202.5 && degrees < 247.5) {
      return 'SW';    //"SW";
    } else if (degrees >= 247.5 && degrees < 292.5) {
      return 'W';                                 //"W";
    } else if (degrees >= 292.5 && degrees < 337.5) {
      return 'NW';         //"NW";
    }
}

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
  //  http://api.openweathermap.org/data/2.5/forecast/daily?id=5128581&mode=json&units=imperial&cnt=14&lang=en&APPID=d53bff8f3256eaf090be3c94964b0cb8
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
    "message": 0.1105234,
    "cnt": 14,
    "list": [
    {
    "dt": 1517590800,
    "temp": {
    "day": 15.19,
    "min": 15.19,
    "max": 15.19,
    "night": 15.19,
    "eve": 15.19,
    "morn": 15.19
    },
    "pressure": 1037.38,
    "humidity": 100,
    "weather": [
    {
    "id": 800,
    "main": "Clear",
    "description": "sky is clear",
    "icon": "01n"
    }
    ],
    "speed": 9.53,
    "deg": 303,
    "clouds": 0
    },
    {
    "dt": 1517677200,
    "temp": {
    "day": 24.82,
    "min": 14.54,
    "max": 27.82,
    "night": 26.8,
    "eve": 25.93,
    "morn": 14.54
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
    "speed": 8.75,
    "deg": 231,
    "clouds": 0
    },
    {
    "dt": 1517763600,
    "temp": {
    "day": 35.11,
    "min": 24.3,
    "max": 35.11,
    "night": 24.3,
    "eve": 33.28,
    "morn": 30.43
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
    "speed": 8.43,
    "deg": 209,
    "clouds": 92,
    "rain": 0.69,
    "snow": 4.46
    },
    {
    "dt": 1517850000,
    "temp": {
    "day": 27.77,
    "min": 20.93,
    "max": 27.77,
    "night": 21.34,
    "eve": 25.29,
    "morn": 20.93
    },
    "pressure": 1025.52,
    "humidity": 0,
    "weather": [
    {
    "id": 800,
    "main": "Clear",
    "description": "sky is clear",
    "icon": "01d"
    }
    ],
    "speed": 7.49,
    "deg": 283,
    "clouds": 0
    },
    {
    "dt": 1517936400,
    "temp": {
    "day": 34.39,
    "min": 25.16,
    "max": 34.39,
    "night": 34.39,
    "eve": 34.05,
    "morn": 25.16
    },
    "pressure": 1032.21,
    "humidity": 0,
    "weather": [
    {
    "id": 600,
    "main": "Snow",
    "description": "light snow",
    "icon": "13d"
    }
    ],
    "speed": 6.4,
    "deg": 185,
    "clouds": 91,
    "rain": 5.39,
    "snow": 0.68
    },
    {
    "dt": 1518022800,
    "temp": {
    "day": 52.93,
    "min": 31.33,
    "max": 52.93,
    "night": 31.33,
    "eve": 44.96,
    "morn": 39.34
    },
    "pressure": 1010.29,
    "humidity": 0,
    "weather": [
    {
    "id": 502,
    "main": "Rain",
    "description": "heavy intensity rain",
    "icon": "10d"
    }
    ],
    "speed": 13.94,
    "deg": 194,
    "clouds": 100,
    "rain": 28.88
    },
    {
    "dt": 1518109200,
    "temp": {
    "day": 27.68,
    "min": 22.86,
    "max": 27.68,
    "night": 22.86,
    "eve": 25.41,
    "morn": 26.82
    },
    "pressure": 1033.88,
    "humidity": 0,
    "weather": [
    {
    "id": 601,
    "main": "Snow",
    "description": "snow",
    "icon": "13d"
    }
    ],
    "speed": 7.83,
    "deg": 5,
    "clouds": 100,
    "snow": 9.15
    },
    {
    "dt": 1518195600,
    "temp": {
    "day": 27.19,
    "min": 17.46,
    "max": 33.28,
    "night": 33.28,
    "eve": 30.78,
    "morn": 17.46
    },
    "pressure": 1041.54,
    "humidity": 0,
    "weather": [
    {
    "id": 600,
    "main": "Snow",
    "description": "light snow",
    "icon": "13d"
    }
    ],
    "speed": 7.74,
    "deg": 59,
    "clouds": 83,
    "rain": 6.73,
    "snow": 0.09
    },
    {
    "dt": 1518282000,
    "temp": {
    "day": 38.77,
    "min": 32.49,
    "max": 38.77,
    "night": 35.62,
    "eve": 37.02,
    "morn": 32.49
    },
    "pressure": 1031.52,
    "humidity": 0,
    "weather": [
    {
    "id": 500,
    "main": "Rain",
    "description": "light rain",
    "icon": "10d"
    }
    ],
    "speed": 2.64,
    "deg": 19,
    "clouds": 78,
    "rain": 1.93
    },
    {
    "dt": 1518368400,
    "temp": {
    "day": 45.43,
    "min": 35.96,
    "max": 45.43,
    "night": 40.1,
    "eve": 44.38,
    "morn": 35.96
    },
    "pressure": 1023.75,
    "humidity": 0,
    "weather": [
    {
    "id": 501,
    "main": "Rain",
    "description": "moderate rain",
    "icon": "10d"
    }
    ],
    "speed": 3.6,
    "deg": 204,
    "clouds": 100,
    "rain": 3.13
    },
    {
    "dt": 1518454800,
    "temp": {
    "day": 43.97,
    "min": 35.82,
    "max": 43.97,
    "night": 39.4,
    "eve": 40.23,
    "morn": 35.82
    },
    "pressure": 1029.63,
    "humidity": 0,
    "weather": [
    {
    "id": 501,
    "main": "Rain",
    "description": "moderate rain",
    "icon": "10d"
    }
    ],
    "speed": 4.68,
    "deg": 79,
    "clouds": 97,
    "rain": 8.83
    },
    {
    "dt": 1518541200,
    "temp": {
    "day": 59.23,
    "min": 41.25,
    "max": 59.23,
    "night": 41.25,
    "eve": 55.71,
    "morn": 49.51
    },
    "pressure": 1012.51,
    "humidity": 0,
    "weather": [
    {
    "id": 500,
    "main": "Rain",
    "description": "light rain",
    "icon": "10d"
    }
    ],
    "speed": 8.14,
    "deg": 248,
    "clouds": 87,
    "rain": 2.4
    },
    {
    "dt": 1518627600,
    "temp": {
    "day": 33.51,
    "min": 20.89,
    "max": 33.51,
    "night": 20.89,
    "eve": 28.27,
    "morn": 32.18
    },
    "pressure": 1025.77,
    "humidity": 0,
    "weather": [
    {
    "id": 800,
    "main": "Clear",
    "description": "sky is clear",
    "icon": "01d"
    }
    ],
    "speed": 7,
    "deg": 351,
    "clouds": 23
    },
    {
    "dt": 1518714000,
    "temp": {
    "day": 30.97,
    "min": 17.55,
    "max": 30.97,
    "night": 25.05,
    "eve": 29.03,
    "morn": 17.55
    },
    "pressure": 1029.42,
    "humidity": 0,
    "weather": [
    {
    "id": 800,
    "main": "Clear",
    "description": "sky is clear",
    "icon": "01d"
    }
    ],
    "speed": 5.1,
    "deg": 289,
    "clouds": 1
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
