function checkRequirements()
{
   if (typeof window.localStorage === 'undefined')
   {
      console.log('Database tidak suport.');
      navigator.notification.alert(
         'Perangkat anda tidak mensuport database yang digunakan pada aplikasi ini.',
         function(){},
         'Error'
      );
      return false;
   }

   return true;
}

function updateIcons()
{
   if ($(window).width() > 480)
   {
      $('a[data-icon], button[data-icon]').each(function() {
         $(this).removeAttr('data-iconpos');
      });
   }
   else
   {
      $('a[data-icon], button[data-icon]').each(function() {
         $(this).attr('data-iconpos', 'notext');
      });
   }
}

function initApplication()
{
   translateMainPage();
   openLinksInApp();
   if (checkRequirements() === false)
   {
      $('#submit-button').button('disable');
      return;
   }

   $.mobile.loading('show');

   fillCurrenciesSelection();
   updateExchangeRates();
   updateLastUpdate();

   $(document).on('online', updateExchangeRates);
   $('#submit-button').click(function(event) {
      event.preventDefault();

      // Convert the value
      var result = Currency.convert(
         $('#from-value').val(),
         $('#from-type').val(),
         $('#to-type').val()
      );

      // Localize the result
      navigator.globalization.numberToString(
         result,
         function(number)
         {
            $('#result').text(number.value);
         },
         function()
         {
            $('#result').text(result);
         }
      );

      // Update settings
      var settings = Settings.getSettings();
      if ($.isEmptyObject(settings))
         settings = new Settings();
      settings.fromCurrency = $('#from-type').val();
      settings.toCurrency = $('#to-type').val();
      settings.save();
   });
   $('#reset-button').click(function(event) {
      event.preventDefault();

      $('#from-value').val(0);
      $('#form-converter select').prop('selectedIndex', 0).selectmenu('refresh');
      $('#result').text(0);
   });
   $('#update-button').click(function(event) {
      event.preventDefault();

      if (navigator.network.connection.type === Connection.NONE)
      {
         console.log('Tidak ada koneksi internet. Tidak dapat mengupdate nilai tukar.');
         navigator.notification.alert(
            'Perangkat anda tidak terkoneksi dengan internet. Tidak dapat mengupdate nilai tukar.',
            function(){},
            'Error'
         );
      }
      else
         updateExchangeRates();
   });

   $.mobile.loading('hide');
}

function translateMainPage()
{
   navigator.globalization.getLocaleName(
      function(locale)
      {
         var translation = Translation[locale.value.substring(0, 2)];
         if (typeof translation === 'undefined')
            return;

         for(var key in translation)
            $('#' + key).auderoTextChanger(translation[key]);
      },
      function()
      {
         console.log('An error has occurred with the translation');
      }
   );
}

function openLinksInApp()
{
   $("a[target=\"_blank\"]").on('click', function(event) {
      event.preventDefault();
      window.open($(this).attr('href'), '_target');
   });
}

function fillCurrenciesSelection()
{
   var currencies = Currency.getCurrencies();
   var $fromCurrencyType = $('#from-type');
   var $toCurrencyType = $('#to-type');

   // Empty elements
   $fromCurrencyType.empty();
   $toCurrencyType.empty();

   // Load all the stored currencies
   for(var i = 0; i < currencies.length; i++)
   {
      $fromCurrencyType.append('<option value="' + currencies[i].abbreviation + '">' +
         currencies[i].abbreviation + '</option>');
      $toCurrencyType.append('<option value="' + currencies[i].abbreviation + '">' +
         currencies[i].abbreviation + '</option>');
   }

   // Update the selected option using the last currencies used
   var settings = Settings.getSettings();
   if (!$.isEmptyObject(settings))
   {
      var currency = $fromCurrencyType.find('[value="' + settings.fromCurrency + '"]');
      if (currency !== null)
         $(currency).attr('selected', 'selected');

      currency = $toCurrencyType.find('[value="' + settings.toCurrency + '"]');
      if (currency !== null)
         $(currency).attr('selected', 'selected');
   }

   $fromCurrencyType.selectmenu('refresh');
   $toCurrencyType.selectmenu('refresh');
}

function updateExchangeRates()
{
   if (navigator.network.connection.type !== Connection.NONE)
   {
      $.mobile.loading(
         'show',
         {
            text: 'Updating rates...',
            textVisible: true
         }
      );

      $.get(
         'http://www.ecb.int/stats/eurofxref/eurofxref-daily.xml',
         null,
         function(data)
         {
            var $currenciesElements = $(data).find('Cube[currency]');
            // The EURO is the default currency, so it isn't in the retrieved data
            var currencies = [new Currency('EUR', '1')];

            var i;
            for(i = 0; i < $currenciesElements.length; i++)
            {
               currencies.push(
                  new Currency(
                     $($currenciesElements[i]).attr('currency'),
                     $($currenciesElements[i]).attr('rate')
                  )
               );
            }

            currencies.sort(Currency.compare);
            // Store the data
            for(i = 0; i < currencies.length; i++)
               currencies[i].save();

            // Update settings
            var settings = Settings.getSettings();
            if ($.isEmptyObject(settings))
               settings = new Settings();
            settings.lastUpdate = new Date();
            settings.save();

            fillCurrenciesSelection();
            updateLastUpdate();
            $('#submit-button').button('enable');
         },
         'XML'
      )
      .error(function() {
         console.log('Tidak dapat mendapatkan nilai tukar dari sumber.');
         navigator.notification.alert(
            'Tidak dapat mendapatkan nilai tukar dari sumber.',
            function(){},
            'Error'
         );
         if (Currency.getCurrencies().length === 0)
            $('#submit-button').button('disable');
      })
      .complete(function() {
         $.mobile.loading('hide');
      });
   }
   // Check if there are data into the local storage
   else if (Currency.getCurrencies().length === 0)
   {
      console.log('Tidak terkoneksi dengan internet dan tidak ada data yang tersimpan sebelumnya.');
      navigator.notification.alert(
         'Tidak terkoneksi dengan internet dan tidak ada data yang tersimpan sebelumnya.\n' +
         'Periksa kembali koneksi internet anda.',
         function(){},
         'Error'
      );
      $('#submit-button').button('disable');
   }
}

function updateLastUpdate()
{
   if (typeof Settings.getSettings().lastUpdate === 'undefined')
   {
      $('#last-update').text('-');
      return;
   }

   // Show the last time the rates have been updated
   navigator.globalization.dateToString(
      new Date(Settings.getSettings().lastUpdate),
      function (date)
      {
         $('#last-update').text(date.value);
      },
      function ()
      {
         $('#last-update').text('-');
      }
   );
}