function parse(e) {
	let search = document.getElementById("search");
	let sbox = document.querySelector(".search-box");
	let text = search.value;
	let result = "";
	let error = "";
	message("");
	switch (true) {
		case /imgur/.test(text):
			result = /(a\/|gallery\/)([A-Z0-9a-z]{5}[A-Z0-9a-z]*\b)/.exec(text);
			if (!result || !result[2])
				return message(
					"Reader could not understand the given link.",
					1,
				);
			result = "/read/imgur/" + result[2] + "/1/1";
			break;
		case /git\.io/.test(text):
			result = /(git.io\/)(.*)/.exec(text);
			if (!result || !result[2])
				return message(
					"Reader could not understand the given link.",
					1,
				);
			result = "/read/gist/" + result[2];
			break;
		case /(raw|gist)\.githubusercontent/.test(text):
			if (!text.startsWith("http")) {
				text = "https://" + text;
			}
			const url = new URL(text);
			result =
				"/read/gist/" +
				btoa(`${url.host.split(".")[0]}${url.pathname}`)
					.replace(/\+/g, "-")
					.replace(/\//g, "_")
					.replace(/\=/g, "");
			break;
		case /^[0-9]{5}[0-9]?$/.test(text) ||
			(/nhentai/.test(text) && /\/\b[0-9]+\b/.test(text)):
			result = /(\/?)(\b[0-9]+\b)/.exec(text);
			console.log(result);
			if (!result || !result[2])
				return message(
					"Reader could not understand the given link.",
					1,
				);
			result = "/read/nhentai/" + result[2];
			break;
		case /mangadex\.org\/title/.test(text):
			result =
				/(\/?)([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/.exec(
					text,
				);
			if (!result || !result[2])
				return message(
					"Reader could not understand the given link.",
					1,
				);
			result = "/read/mangadex/" + result[2];
			break;
		case /weebcentral\.com/.test(text):
			text = text.replace(/\/$/, "");
			if (text.includes("/series/")) {
				slug_name = text.split("/series/").pop().split("/")[0];
			} else {
				return message(
					"Reader could not understand the given link.",
					1,
				);
			}
			result = "/read/weebcentral/" + slug_name;
			break;
		case /reddit\.com/i.test(text):
			result =
				/reddit\.com\/(?:r|u(?:ser)?)\/(?:[a-zA-Z0-9_\-]+)\/comments\/([a-z0-9]+)/i.exec(
					text,
				);
			if (!result || !result[1])
				result = /reddit\.com\/gallery\/([a-z0-9]+)/i.exec(text);
			if (!result || !result[1])
				return message(
					"Reader could not understand the given link.",
					1,
				);
			result = "/read/reddit/" + result[1];
			break;
		case /imgchest\.com/.test(text):
			result = /p\/(\w+)/i.exec(text);
			if (!result || !result[1])
				return message(
					"Reader could not understand the given link.",
					1,
				);
			result = "/read/imgchest/" + result[1];
			break;
		case /catbox\.moe/.test(text):
			result = /c\/(\w+)/i.exec(text);
			if (!result || !result[1])
				return message(
					"Reader could not understand the given link.",
					1,
				);
			result = "/read/catbox/" + result[1];
			break;
		default:
			return message("Reader could not understand the given link.", 1);
			break;
	}
	if (!result.endsWith("/")) {
		result += "/";
	}
	if (result) {
		sbox.classList.add("spin");
		fetch(location.origin + result).then((response) => {
			if (response.status != 200) {
				let spin = getComputedStyle(sbox.children[0]).transform;
				var values = spin.split("(")[1].split(")")[0].split(",");
				var a = values[0];
				var b = values[1];
				var c = values[2];
				var d = values[3];
				var scale = Math.sqrt(a * a + b * b);
				var sin = b / scale;
				var angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
				sbox.children[0].style.transform = `rotate(${angle}deg)`;
				sbox.classList.remove("spin");
				setTimeout(() => {
					sbox.children[0].style.transform = "rotate(0deg)";
					setTimeout(() => {
						sbox.children[0].style.transform = "";
					}, 600);
				}, 20);
				return message(
					"Failed loading the proxy for the given URL.",
					1,
				);
			}
			location.href = location.origin + result;
		});
	}
}

function message(message, type) {
	document.getElementById("status").innerText = message;
	if (type === 0) {
		document.getElementById("status").classList.add("green");
		document.getElementById("status").classList.remove("red");
	} else if (type === 1) {
		document.getElementById("status").classList.add("red");
		document.getElementById("status").classList.remove("green");
	} else {
		document.getElementById("status").classList.remove("green");
		document.getElementById("status").classList.remove("red");
	}
}

document.getElementById("search").addEventListener("keyup", (e) => {
	if (e.key == "Enter") {
		parse();
	}
});
document.getElementById("search-button").addEventListener("click", parse);

function UI_HistoryView(o) {
	o = be(o);
	UI.call(
		this,
		Object.assign(o, {
			kind: ["HistoryView"].concat(o.kind || []),
			html: `
			<div>
				<div style="text-align: center"><div class="history-button manga-link" data-bind="history_button">Enable history</div></div>
				<div class="history-desc" data-bind="history_desc"></div>
				<h2 class="pinned-header" data-bind="pinned-header">Pinned</h2>
				<div class="pinned" data-bind="pinned"></div>
				<h2 class="history-header" data-bind="history-header" style="gap: 0.5em"><span>Your history</span><a style="margin-left: auto" class="manga-link" data-bind="export_history">Export</a><a class="manga-link" data-bind="import_history">Import</a><input type="file" data-bind="import_file" accept=".json" style="display: none" /><a class="manga-link" data-bind="clear">Clear history</a></h2>
				<div data-bind="import_status" style="text-align: right; padding: 0 1.5rem; opacity: 0.8; font-size: 0.85em;"></div>
				<div class="history" data-bind="history"></div>
				<div class="history-sync" data-bind="history_sync"></div>
				<div data-bind="history_kill" style="text-align: center; padding: 3rem 0 2rem; border-top: 1px solid rgba(255,255,255,0.1)"><a class="manga-link" data-bind="disable">Turn off history and destroy local data</a></div>
			</div>`,
		}),
	);
	Linkable.call(this);

	this._.pinned = new UI_List({ node: this._.pinned });
	this._.history = new UI_List({ node: this._.history });
	this._.history_button.onclick = async () => {
		await globalHistoryHandler.toggle.enable();
		this.render();
	};
	this._.disable.onclick = async () => {
		if (
			!confirm(
				"This will remove all your local pinned series and history and will stop history recording. If you were signed into RemoteStorage, you will be signed out. Proceed?",
			)
		)
			return;
		await globalHistoryHandler.toggle.disable();
		this.firstUse = true;
		this.render();
	};

	this._.clear.onclick = async () => {
		if (!confirm("Clear all history? Pinned series will not be affected.")) return;
		await globalHistoryHandler.removeAllUnpinnedSeries();
		// globalHistoryHandler.toggle.disable();
		this.firstUse = true;
		this.render();
	};

	this._.export_history.onclick = async () => {
		const allSeries = await remoteStorage[RS_PATH].getAllSeries();
		const data = JSON.stringify(Object.values(allSeries || {}), null, 2);
		const blob = new Blob([data], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "cubari-history.json";
		a.click();
		URL.revokeObjectURL(url);
	};

	this._.import_history.onclick = () => {
		this._.import_file.value = "";
		this._.import_file.click();
	};

	this._.import_file.onchange = async () => {
		const file = this._.import_file.files[0];
		if (!file) return;
		let entries;
		try {
			entries = JSON.parse(await file.text());
		} catch (e) {
			this._.import_status.textContent = "Error: could not parse file.";
			return;
		}
		if (!Array.isArray(entries)) {
			this._.import_status.textContent =
				"Error: file does not contain a valid history array.";
			return;
		}
		let imported = 0,
			skipped = 0;
		for (const entry of entries) {
			if (!entry.slug || !entry.source || !entry.url || !entry.title) {
				skipped++;
				continue;
			}
			try {
				const existing = await remoteStorage[RS_PATH].getSeries(
					entry.slug,
					entry.source,
				);
				if (existing) {
					const mergedChapters = [
						...new Set([
							...(existing.chapters || []),
							...(entry.chapters || []),
						]),
					];
					await remoteStorage[RS_PATH].editSeries(
						entry.slug,
						entry.coverUrl || existing.coverUrl,
						entry.source,
						entry.url,
						entry.title,
						existing.pinned || entry.pinned,
						mergedChapters,
					);
				} else {
					await remoteStorage[RS_PATH].addSeries(
						entry.slug,
						entry.coverUrl || "",
						entry.source,
						entry.url,
						entry.title,
						entry.pinned || false,
						entry.chapters || [],
					);
				}
				imported++;
			} catch (e) {
				skipped++;
			}
		}
		this._.import_status.textContent = `Import complete: ${imported} entries imported, ${skipped} skipped.`;
		this.render();
	};

	this.firstUse = true;

	this.render = async () => {
		if (globalHistoryHandler.enabled()) {
			this._.history_button.classList.add("hidden");
			this._.history_kill.classList.remove("hidden");
		} else {
			this._.history_button.classList.remove("hidden");
			this._.history_kill.classList.add("hidden");
			this._.history_desc.innerHTML = this._.history_sync.innerHTML = "";
			this.$.classList.remove("has-pinned");
			this.$.classList.remove("has-history");
			this.widget = null;
			return;
		}
		this._.pinned.clear();
		this._.history.clear();
		this.pinnedSeries = (
			await globalHistoryHandler.getAllPinnedSeries()
		).filter((e) => e.source !== "default");
		if (this.pinnedSeries.length) {
			this.firstUse = false;
			this.$.classList.add("has-pinned");
			this.pinnedSeries.forEach((item) => {
				this._.pinned.add(
					new UI_HistoryUnit({
						url: item.url,
						pinned: true,
						slug: item.slug,
						title: item.title,
						source: item.source,
						coverUrl: item.coverUrl,
					}).S.link(this),
				);
			});
			if (this.pinnedSeries.length == 2)
				this._.pinned.$.setAttribute("data-things", 2);
			if (this.pinnedSeries.length == 3)
				this._.pinned.$.setAttribute("data-things", 3);
		} else {
			this.$.classList.remove("has-pinned");
		}

		this.unpinnedSeries = await globalHistoryHandler.getAllUnpinnedSeries();
		if (this.unpinnedSeries.length) {
			this.firstUse = false;
			this.$.classList.add("has-history");
			this.unpinnedSeries.forEach((item) => {
				this._.history.add(
					new UI_HistoryUnit({
						url: item.url,
						pinned: false,
						slug: item.slug,
						title: item.title,
						source: item.source,
						coverUrl: item.coverUrl,
					}).S.link(this),
				);
			});
			if (this.unpinnedSeries.length == 2)
				this._.history.$.setAttribute("data-things", 2);
			if (this.unpinnedSeries.length == 3)
				this._.history.$.setAttribute("data-things", 3);
		} else {
			this.$.classList.remove("has-history");
		}

		if (this.firstUse) {
			this._.history_desc.innerHTML = `
				<p style="text-align: center;opacity: 0.8;">Looks like your history is currently empty.<br>Open any series in the reader and you will see it here.<br>You will also have an option to erase your history.</p>
				<p style="text-align: center;"><a class="manga-link" id="history-import-empty">Import history from file</a></p>`;
			document.getElementById("history-import-empty").onclick = () => {
				this._.import_file.value = "";
				this._.import_file.click();
			};
		} else {
			this._.history_desc.innerHTML = "";
		}

		if (!this._.history_sync.innerHTML)
			this._.history_sync.innerHTML = `
		<h2 style="margin-top: 5rem;">History synchronisation</h2>
		<p>You can synchronize your reading history and pinned galleries across different devices. This is done using a third-party data storage service (which you can also host yourself to have full control over your data).</p>
		<p>To get started, create an account with any <code>remotestorage</code> provider. We recommend <a href="https://5apps.com/storage">5apps</a> since it's free.</p>
		<p>Once you've created an account (eg. <code>user@5apps.com</code>), log in below:</p>
		<div id="rs-widget"></div>`;

		if (!this.widget && document.getElementById("rs-widget")) {
			this.widget = new Widget(remoteStorage, {});
			this.widget.attach("rs-widget");
		}

		window.addEventListener("history-ready", () => {
			this._.history_sync.classList.add("history-ready");
		});
	};

	this.S.mapIn({
		pinned: this.render.bind(this),
	});

	this.render();
}

function UI_HistoryUnit(o) {
	o = be(o);
	UI.call(
		this,
		Object.assign(o, {
			kind: ["HistoryUnit"].concat(o.kind || []),
			html: `<div><a class="manga-card smol proxy">
			<div class="bloor" data-bind="bloor"></div>
			<picture>
				<img data-bind="cover" />
			</picture>
			<article>
				<h2><span data-bind="title"></span><span class="tag" data-bind="source"></span></h2>
			</article>
			<div class="button-drawer">
				<i class="ico-btn" data-bind="pin"></i>
				<i class="ico-btn icon-close" data-bind="remove"></i>
			</div>
			</a><div>`,
		}),
	);
	Linkable.call(this);

	this.url = o.url;
	this.slug = o.slug;
	this.title = o.title;
	this.source = o.source;
	this.pinned = o.pinned;
	this.coverUrl = o.coverUrl;

	this.render = () => {
		this.$.firstElementChild.href = this.url;
		this._.bloor.style.backgroundImage = `url('${this.coverUrl}')`;
		this._.cover.src = this.coverUrl;
		this._.title.textContent = this.title || "No title";
		this._.title.source = this.source.replace("_", " ");
		if (this.pinned) {
			this._.pin.classList.add("icon-pin-x");
			this._.pin.classList.remove("icon-pin");
		} else {
			this._.pin.classList.add("icon-pin");
			this._.pin.classList.remove("icon-pin-x");
		}
		this._.pin.onclick = this.pinHandler;
		this._.remove.onclick = this.removeHandler;
	};

	this.pinHandler = (e) => {
		e.preventDefault();
		if (this.pinned) {
			globalHistoryHandler
				.unpinSeries(this.slug, this.source)
				.then(() => {
					this.S.out("pinned", this);
				});
		} else {
			this.pinned = true;
			globalHistoryHandler.pinSeries(this.slug, this.source).then(() => {
				this.S.out("pinned", this);
			});
		}
	};
	this.removeHandler = (e) => {
		e.preventDefault();
		globalHistoryHandler.removeSeries(this.slug, this.source);
		this.destroy();
	};
	this.render();
}

window.addEventListener("load", async () => {
	document.getElementById("history").appendChild(new UI_HistoryView().$);
});
document.addEventListener("scroll", (e) => {
	if (window.scrollY > 50) {
		document.body.classList.add("search-focus");
	} else {
		document.body.classList.remove("search-focus");
	}
});
