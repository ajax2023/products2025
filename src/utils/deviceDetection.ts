export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  
  const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
  const isChrome = /chrome/.test(userAgent);

  const iOSVersion = isIOS ? parseInt(userAgent.match(/os (\d+)_/)?.[1] || '0') : 0;
  const androidVersion = isAndroid ? parseInt(userAgent.match(/android (\d+)/)?.[1] || '0') : 0;

  return {
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    hasLiveText: isIOS && iOSVersion >= 15,
    hasMLKit: isAndroid && androidVersion >= 9,
    isMobile: isIOS || isAndroid
  };
};
