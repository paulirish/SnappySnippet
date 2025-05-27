/*
 Allows to read, change and override settings kept in localStorage

 FIXME Can be replaced with chrome.storage.local as soon as http://crbug.com/178618 will be resolved
 FIXME Can be replaced with localStorage on the panel page as soon as http://crbug.com/319328 will be resolved
 */
chrome.runtime.onMessage.addListener(async function (message, sender, callback) {
	"use strict";

	if (message.name === 'getSettings') {
		const keys = await chrome.storage.local.getKeys();
		// const allSettings = await chrome.storage.local.get(keys);
		// callback(allSettings);
	} else if (message.name === 'setSettings') {
		// chrome.storage.local.set(message.data ?? {});
	} else if (message.name === 'changeSetting') {
		// const setting = {[message.item]: message.value};
		// chrome.storage.local.set(setting);
	}
});
