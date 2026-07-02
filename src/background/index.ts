chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'WORKDAY_SCAN_PAGE' && message?.type !== 'WORKDAY_FILL_CURRENT_PAGE') {
    return false;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];

    if (!activeTab?.id) {
      sendResponse({ fields: [], filled: [], skipped: [], error: 'No active tab found.' });
      return;
    }

    sendMessageToTab(activeTab.id, message, (response) => {
      if (!chrome.runtime.lastError) {
        sendResponse(response ?? { fields: [], filled: [], skipped: [] });
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          files: ['assets/content.js'],
        },
        () => {
          sendMessageToTab(activeTab.id, message, (retryResponse) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                fields: [],
                filled: [],
                skipped: [],
                error:
                  'The page did not accept the content script. Open a real Workday application tab and try again.',
              });
              return;
            }

            sendResponse(retryResponse ?? { fields: [], filled: [], skipped: [] });
          });
        },
      );
    });
  });

  return true;
});

function sendMessageToTab(tabId: number, message: Record<string, unknown>, callback: (response: unknown) => void) {
  chrome.tabs.sendMessage(tabId, message, callback);
}
