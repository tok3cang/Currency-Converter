function checkRequirements()
{
   if (typeof window.localStorage === 'undefined')
   {
      console.log('Database tidak suport.');
      navigator.notification.alert(
         'Your device do not support the use of data storage',
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

      var result = Currency.convert(
         $('#from-value').val(),
         $('#from-type').val(),
         $('#to-type').val()
      );

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
            'Your device is not connected to the Internet. Unable to update the exchange rate.',
            function(){},
            'Error'
         );
      }
      else
         updateExchangeRates();
   });

   $.mobile.loading('hide');
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

   $fromCurrencyType.empty();
   $toCurrencyType.empty();

   for(var i = 0; i < currencies.length; i++)
   {
      $fromCurrencyType.append('<option value="' + currencies[i].abbreviation + '">' +
         currencies[i].abbreviation + '</option>');
      $toCurrencyType.append('<option value="' + currencies[i].abbreviation + '">' +
         currencies[i].abbreviation + '</option>');
   }

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
            for(i = 0; i < currencies.length; i++)
               currencies[i].save();

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
            'Unable to get the exchange rate from the source.',
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
   else if (Currency.getCurrencies().length === 0)
   {
      console.log('Tidak terkoneksi dengan internet dan tidak ada data yang tersimpan sebelumnya.');
      navigator.notification.alert(
         'Not connected to the internet and there are no previously stored data. \n'+
          'Check your internet connection.',
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