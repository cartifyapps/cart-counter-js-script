function GoKartShopifyAppCartCounter() {
 var endPoints = {};
 var EXPIRED_ACTIONS ={'CLEAR_CART':'CLEAR_CART','RESET_TIME':'RESET_TIME','NONE':'NONE'};
 var settings = {};
 var localStorageSettingsKey = 'go-kart-shopify-app-cart-settings';
 var goKartShopifyAppCartCounterJQ = undefined;
 var selectors = {
  'nf' : 'go-kart-shopify-app-cart-counter-notification-bar',
  'nf_timer' : 'go-kart-shopify-app-cart-counter-countdown-time',
 };
 var localStorageSettings = null;
 var countDownTimerIntervalId = 0;

 this.initEndPoints = function () {
  endPoints  = {
   APP_SETTINGS:  'https://cart-counter.cartifyapps.com/store-front-api/get-store-information?shop='+this.getShop()
  };
 };

 this.init = function () {
  this.initEndPoints();
  this.injectJquery(function () {
   this.initAppSettings(function (settings) {
    if (Number(settings.is_active)) {
     if (Number(settings.is_nf_active_cp)) {
      if(Number($(window).width()) > 768 || Number(settings.is_nf_active_on_mobile)){
       this.getShopifyCart(function (shopifyCartData) {
        this.initLocalStorage(shopifyCartData);
        this.initAddToCartActionListeners();
        this.initNotificationBarOnCartPage();
        this.initCountDownTimer();
       }.bind(this))
      }
     }//if notification bar is active
    }//if app is active
   }.bind(this));
  }.bind(this))

 };

 this.initAppSettings = function (callback) {
  goKartShopifyAppCartCounterJQ.ajax({
   method: 'GET',
   url:endPoints.APP_SETTINGS,
   dataType :'json',
   success: function (data) {
    if(data.hasOwnProperty('_metadata') && data._metadata.hasOwnProperty('outcomeCode') && data._metadata.outcomeCode === 0){
     if(data.hasOwnProperty('records') && data.records.hasOwnProperty('settings') ){
         settings = data.records.settings;
        callback(data.records.settings);
     }
    }
   }
  });
 };

 this.initLocalStorage = function (shopifyCartData) {
  try {
   localStorageSettings = JSON.parse(localStorage.getItem(localStorageSettingsKey));
   if(!localStorageSettings.hasOwnProperty('token') || !localStorageSettings.hasOwnProperty('cartStartTime')) localStorageSettings = null;
  }catch (e) {
   localStorageSettings = null;
  }

  if(localStorageSettings === null || localStorageSettings.token !== shopifyCartData.token){
   localStorageSettings = {
    'token' : shopifyCartData.token,
    'cartStartTime' : new Date()
   };
   localStorage.setItem(localStorageSettingsKey,JSON.stringify(localStorageSettings));
  }

 };

 this.initAddToCartActionListeners = function () {
  if(settings.is_reset_on_cart_add){
   $("form[action='/cart/add'] [type=submit]").click(function () {
    this.resetCartStartTime();
   }.bind(this));
  }
 };

 this.initCountDownTimer = function () {
  var timerInSeconds = this.getCountDownStartTimeInSeconds();
  countDownTimerIntervalId = setInterval(function () {
    timerInSeconds -= 1;
    if(timerInSeconds <= 0) {
     clearInterval(countDownTimerIntervalId);
     if(settings.expired_action === EXPIRED_ACTIONS['RESET_TIME']){
      this.resetCartStartTime();
      this.initCountDownTimer();
     }else if(settings.expired_action === EXPIRED_ACTIONS['CLEAR_CART']){
      this.clearShopifyCart();
     }
     this.updateNotificationBar();
    }else{
     this.updateNotificationBar();
    }

   }.bind(this),1000);
 };

 this.initNotificationBarOnCartPage = function () {
  var timerInSeconds = this.getCountDownStartTimeInSeconds();
  if(goKartShopifyAppCartCounterJQ('body.template-cart').length){
   goKartShopifyAppCartCounterJQ('form[action="/cart"]').before(`
        <div style="color:${settings.nf_color_hex};background:${settings.nf_bg_hex};text-align:center;padding: 20px 0;font-size: 19px;display: none;" id="${selectors.nf}">${settings.nf_timer_running_text} ${this.getDisplayTimeFormat(timerInSeconds)}</div>
      `);
  }
 };

 this.updateNotificationBar = function () {
  var timerInSeconds = this.getCountDownStartTimeInSeconds();
  if(goKartShopifyAppCartCounterJQ(`#${selectors.nf}`).length){
   if(timerInSeconds <= 0) {
    goKartShopifyAppCartCounterJQ(`#${selectors.nf}`).css('display','').html(settings.nf_time_expired_text);
    setTimeout(function () {
     goKartShopifyAppCartCounterJQ(`#${selectors.nf}`).remove();
    }.bind(this),4000);
   }else {
    goKartShopifyAppCartCounterJQ(`#${selectors.nf}`).css('display','').html(`${settings.nf_timer_running_text} ${this.getDisplayTimeFormat(timerInSeconds)}`);
   }
  }
 };


 this.resetCartStartTime = function () {
  localStorageSettings.cartStartTime = new Date();
  localStorage.setItem(localStorageSettingsKey,JSON.stringify(localStorageSettings));

 };

 this.getDisplayTimeFormat = function (seconds) {
  var preparedMinutes = Math.floor(seconds / 60);
  var preparedSeconds  = seconds - preparedMinutes * 60;
  return `${this.pad(preparedMinutes,2)}:${this.pad(preparedSeconds,2)}`;
 };

 this.getCountDownStartTimeInSeconds = function () {
  var timerInSeconds = Number(settings.count_down_time_minutes) * 60;
  var currentDateTimeObj = new Date();
  var countDownStartTime = new Date(localStorageSettings.cartStartTime);
  timerInSeconds = timerInSeconds - Math.floor((currentDateTimeObj - countDownStartTime) / (1000));
  if(timerInSeconds < 0) timerInSeconds = 0;
  return timerInSeconds;
 };

 this.injectJquery = function (callback) {

   var script = document.createElement('script');
   script.src = 'https://code.jquery.com/jquery-3.5.1.min.js';
   script.onload = function() {
    goKartShopifyAppCartCounterJQ = jQuery.noConflict(true);
   };
   var head = document.head || document.getElementsByTagName('head')[0];
   head.appendChild(script);

  var jqueryInjectInterval = setInterval(function () {
   if(!(goKartShopifyAppCartCounterJQ === undefined)){
    clearInterval(jqueryInjectInterval);
    callback();
   }
  },1000);
 };

 this.getShopifyCart = function (callback) {
  goKartShopifyAppCartCounterJQ.ajax({
   method: 'GET',
   url:'/cart.js',
   dataType :'json',
   success: function (data) {
    if(data.hasOwnProperty('item_count') && data.item_count > 0){
     if(data.hasOwnProperty('token')){
      callback(data);
     }
    }
   }
  });
 };

 this.clearShopifyCart = function () {
  goKartShopifyAppCartCounterJQ.ajax({
   method: 'POST',
   url:'/cart/clear.js',
   dataType :'json',
   success: function (data) {}
  });
 };

 this.pad = function(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
 }

 this.getShop = function () {
  return Shopify.shop;
 }

}

if(Shopify){
 (new GoKartShopifyAppCartCounter).init();
}
