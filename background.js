console.log(chrome.runtime.id)


const browser = (() => {
  const browser = {}

  for (const name of ['tabs', 'storage']) {
    browser[name] = {}
    for (const [key, value] of Object.entries(chrome[name] || {})) {
      browser[name][key] = (...args) => new Promise(resolve => value?.(...args, resolve))
    }
  }

  return browser
}) ()


const openPage = async () => {
  const [ tab ] = await browser.tabs.query({ url: chrome.runtime.getURL('page/index.html'), currentWindow: true })
  if (tab) {
    chrome.tabs.update(tab.id, { active: true })
  } else {
    chrome.tabs.create({ url: 'page/index.html' })
  }
}


/**
 * アイコン押下時
 */

chrome.browserAction.onClicked.addListener(async tab => {
  await openPage()
})

