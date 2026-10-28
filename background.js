const ORIGINS = ["https://mdt.gtacityrp.fr/*"];

browser.action.onClicked.addListener(async () => {
  const granted = await browser.permissions.request({ origins: ORIGINS });
  if (granted) browser.tabs.reload();
});