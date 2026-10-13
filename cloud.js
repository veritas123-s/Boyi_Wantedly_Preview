(function () {
"use strict";

function init() {
document.querySelectorAll("[data-cloud-list]").forEach(function (group) {
if (group.dataset.cloudFilterReady === "true") return;
group.dataset.cloudFilterReady = "true";

function own(selector) {
return Array.from(group.querySelectorAll(selector)).filter(function (el) {
return el.closest("[data-cloud-list]") === group;
});
}

var search = own("input[data-cloud-search]")[0];
var buttons = own("button[data-cloud-category]");
var items = own(
"article[data-cloud-item][data-category][data-search]," +
"a[data-cloud-item][data-category][data-search]"
);
var counts = own("[data-cloud-count]");
var selected = buttons.find(function (button) {
return button.getAttribute("aria-pressed") === "true";
});
var category = selected ? selected.dataset.cloudCategory : "all";

function normalize(value) {
return String(value || "").normalize("NFKC").toLocaleLowerCase().trim();
}

counts.forEach(function (count) {
count.setAttribute("role", "status");
count.setAttribute("aria-live", "polite");
count.setAttribute("aria-atomic", "true");
});

function update() {
var query = normalize(search ? search.value : "");
var terms = query ? query.split(/\s+/) : [];
var visible = 0;

items.forEach(function (item) {
var text = normalize(item.dataset.search);
var match = (category === "all" || item.dataset.category === category) &&
terms.every(function (term) { return text.includes(term); });
item.hidden = !match;
if (match) visible += 1;
});

buttons.forEach(function (button) {
button.setAttribute(
"aria-pressed",
String(button.dataset.cloudCategory === category)
);
});
counts.forEach(function (count) {
count.textContent = "当前显示 " + visible + " 项，共 " + items.length + " 项";
});
}

buttons.forEach(function (button) {
button.addEventListener("click", function (event) {
event.preventDefault();
category = button.dataset.cloudCategory;
update();
});
});
if (search) search.addEventListener("input", update);
update();
});

document.querySelectorAll("button[data-cloud-pending]").forEach(function (button) {
if (button.dataset.cloudPendingReady === "true") return;
button.dataset.cloudPendingReady = "true";
button.setAttribute("aria-haspopup", "dialog");

button.addEventListener("click", function (event) {
event.preventDefault();
var dialog = document.createElement("dialog");
dialog.className = "cloud-dialog";
dialog.setAttribute("data-cloud-dialog", "");

var title = document.createElement("h2");
title.textContent = (button.dataset.pendingTitle || "功能") + "（待补）";
var detail = document.createElement("p");
detail.textContent = "此项尚未开放，本预览不受理相关操作。" +
(button.dataset.pendingDetail ? " " + button.dataset.pendingDetail : "");
var close = document.createElement("button");
close.type = "button";
close.textContent = "关闭";
close.autofocus = true;

var id = "cloud-pending-title";
var suffix = 0;
while (document.getElementById(id)) {
suffix += 1;
id = "cloud-pending-title-" + suffix;
}
title.id = id;
detail.id = id + "-detail";
while (document.getElementById(detail.id)) detail.id += "-next";
dialog.setAttribute("aria-labelledby", title.id);
dialog.setAttribute("aria-describedby", detail.id);
dialog.append(title, detail, close);
(button.closest(".cloud-shell") || document.body).append(dialog);

dialog.addEventListener("close", function () {
dialog.remove();
if (button.isConnected) button.focus();
}, { once: true });
close.addEventListener("click", function () { dialog.close(); });
dialog.addEventListener("cancel", function (cancelEvent) {
cancelEvent.preventDefault();
dialog.close();
});
dialog.showModal();
close.focus();
});
});
}

if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
init();
}
})();