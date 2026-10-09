chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Tag Assistant Power Tools installed.");
  }
});
