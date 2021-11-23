
const SETTING_HIDDEN = -1;
const SETTING_CUSTOM = 1;
const SETTING_BOOLEAN = 10;
const SETTING_MULTI = 20;
const SETTING_COLOR = 11;
const SETTING_BUTTON = 12;
const SETTING_MULTI_DROPDOWN = 21;
const SETTING_VALUE = 30;
const SETTING_VALUE_STEPPED = 31;
	
function Setting(o) {
	Linkable.call(this);
	this.name = o.name;
	this.addr = o.addr;
	this.prettyName = o.prettyName;
	this.setting = this.default = o.default;
	this.type = o.type || SETTING_HIDDEN;
	if(o.options !== undefined) {
		if(o.options instanceof Function)
			this.options = o.options;
		else{
			if(o.options instanceof Array){
				this.optionsPrimitive = o.options.slice(0);
				this.options = function() {return this.optionsPrimitive};
			}else
				this.optionsPrimitive = o.options;
		}
	}else if(this.type == SETTING_BOOLEAN){
		this.options = function() {return [true, false]};
	}
	this.strings = o.strings;
	this.postUpdate = o.postUpdate;
	this.html = o.html;
	this.global = (o.global===undefined)?true:o.global;
	this.manual = o.manual; //if true, the setting needs an external .setClass call to update the class. This can be used where class update needs to be in the middle of something.
	this.hidden = o.hidden;
	this.condition = o.condition;
	this.nomobile = o.nomobile;
	this.compact = o.compact;
	this.help = o.help;
	this.disabled = o.disabled || false;

	this.checkOptionValidity = function(value) {
		if(this.options == undefined)
			return true;
		
		if(this.options() instanceof Array)
			return this.options().includes(value);
		
		return this.options() == value;
	}

	this.refresh = function() {
		if(!this.checkOptionValidity(this.get()))
			this.set(this.default);
	}

	this.update = function() {
		this.set(this.get());
	}
	this.get = function() {
		return this.setting;
	}
	this.set = function(value, silent, notip) {
		if(!this.checkOptionValidity(value)) return null;
		this.setting = value;
		if(this.global && !this.manual)
			this.setClass();
		this.S.out('settingEvent', {
			type: 'change',
			setting: this
		})
		return this.setting;
	}
	this.cycle = function(options, silent, notip) {
		switch(this.type){
			case SETTING_BOOLEAN:
			case SETTING_MULTI:
			case SETTING_MULTI_DROPDOWN:
			case SETTING_VALUE:
			case SETTING_VALUE_STEPPED:
				if(options === undefined)
					options = this.options();
			var index = options.indexOf(this.get());
				return this.set(
					(index+1 > options.length - 1)?options[0]:options[index+1],
					silent
				);
				break;
		}
		return null;
	}
	this.next = function(silent, notip) {
		if(!this.options() instanceof Array) return;
		if(this.options().includes(this.setting)) {
		var targetIndex = this.options().indexOf(this.setting) + 1;
			if(targetIndex > this.options().length - 1) return;
			return this.set(this.options()[targetIndex], silent, notip)
		}
		return null;
	}
	this.prev = function(silent, notip) {
		if(!this.options() instanceof Array) return;
		if(this.options().includes(this.setting)) {
		var targetIndex = this.options().indexOf(this.setting) - 1;
			if(targetIndex < 0) return;
			return this.set(this.options()[targetIndex], silent, notip)
		}
		return null;
	}
	this.getFormatted = function(option) {
		option = option===undefined?this.get():option;
		if(this.strings) {
			if(this.strings instanceof Function) {
				return this.strings(option);
			}
			return this.strings[option];
		}else{
			return option;
		}
	}
	this.getHelp = function(option) {
		option = option===undefined?this.get():option;
		if(this.help) {
			if(typeof this.help == 'string') {
				return this.help;
			}
			return this.help[option];
		}else{
			return '';
		}
	}
	this.classString = function(option) {
		if(option !== undefined) {
			return this.name + '-' + option;
		}else{
			return this.name + '-' + this.get();
		}
	}
	this.setClass = function() {
	var classList = document.body.classList;
		switch(this.type){
			case SETTING_BOOLEAN:
				classList.remove(this.classString(!this.get()));
				classList.add(this.classString());
				break;
			case SETTING_MULTI:
			case SETTING_MULTI_DROPDOWN:
			case SETTING_VALUE:
			case SETTING_COLOR:
			case SETTING_BUTTON:
			case SETTING_VALUE_STEPPED:
				classList.remove.apply(classList, [].filter.call(classList, cl => cl.indexOf(this.name) == 0));
				classList.add(this.classString());
				break;
		}
	}
	this.disable = () => {
		this.disabled = true;

	}
	this.enable = () => {
		this.disabled = false;
	}
}

function SettingsCategory(name, hidden, icon) {
	nonEnum(this, "name", name);
	nonEnum(this, "hidden", hidden);
	nonEnum(this, "icon", hidden);
}


function SettingsHandler(){
	Linkable.call(this);

	this.settings = {
		lyt: new SettingsCategory('Reader', false),
		bhv: new SettingsCategory('Behavior', false),
		apr: new SettingsCategory('Layout', false),
		thm: new SettingsCategory('Themes', false),
		adv: new SettingsCategory('Advanced', false),
		misc: new SettingsCategory('Miscellaneous', true),
	};
	this.all = {};

	this.newSetting = function(o) {
	let obj = Object.byString(this.settings, o.addr.split('.').slice(0, -1).join('.'));
		o.name = o.addr.split('.').pop();
		this.all[o.addr] = obj[o.name] = new Setting(o);
		this.all[o.addr].S.link(this);
		return this;
	}

	this.deserialize = function() {
		if(!localStorage) return;
	var settings = localStorage.getItem('settings');
		try{
			if(!settings) throw 'No settings';
			settings = JSON.parse(settings);
			if(settings.VER && settings.VER != this.ver) {
				throw 'Settings ver changed';
			}
			for(var setting in settings) {
				if(setting == 'VER') continue;
				this.set(setting, settings[setting], true);
			}
		}catch (e){
			localStorage.setItem('settings','');
			console.warn('Settings were found to be corrupted and so were reset.');
			for (var setting in this.all) {
				this.all[setting].set(this.all[setting].get());
			}
		}
	}

	this.sendInit = function() {
		for(var setting in this.all) {
			this.S.out('settingsPacket', new SettingsPacket('change', setting, this.get(setting)))
		}
	}

	this.serialize = function() {
	var settings = {};
		for(var setting in this.all) {
			settings[setting] = this.all[setting].get();
		}
		// delete groupPreference from localstorage so it does not load preferred group even on better quality release
		delete settings['misc.groupPreference'];
		settings.VER = this.ver;
		return JSON.stringify(settings);
	}

	this.query = function(qu, or) {
		if(or) {
			for(var key in qu) {
			var setting = this.getByAddr(key);
				if(qu[key][0] == '!') {
					if(qu[key].substr(1) != setting.get()) return true;
				}else{
					if(qu[key] == setting.get()) return true;
				}
			}
			return false;
		}else{
			for(var key in qu) {
			var setting = this.getByAddr(key);
				if(qu[key] instanceof Array) {
					if(qu[key][0][0] == '!') {
						if(qu[key][0].substr(1) == setting.get()){
							try { if(qu[key][1] === 'or') continue } catch(err) {};
							return false;
						}
						else {
							try { if(qu[key][1] === 'or') return true } catch(err) {};
							continue;
						}
					}
					if(qu[key].includes(setting.get())) continue;
				}
				if(qu[key][0] == '!') {
					if(qu[key].substr(1) == setting.get()) return false;
				}else{
					if(qu[key] != setting.get()) return false;
				}
			}
		}
		try { if(qu[key][1] === 'or') return false } catch(err) {};
		return true;
	}

	this.getByAddr = function(addr) {
		return this.all[addr];
	}
	this.get = function(setting){
		return this.getByAddr(setting).get();
	}
	this.set = function(setting, value, packet){
		if(is(this.getByAddr(setting).set(value))){
			this.update(setting, packet);
		}
	}
	this.cycle = function(setting, options, packet){
		if(is(this.getByAddr(setting).cycle(options))){
			this.update(setting, packet);
		}
	}
	this.setClass = function(setting){
		this.getByAddr(setting).setClass();
	}
	this.next = function(setting, silent){
		if(is(this.getByAddr(setting).next(silent))) {
			this.update(setting);
		}
	}
	this.prev = function(setting, silent){
		if(is(this.getByAddr(setting).prev(silent))) {
			this.update(setting);
		}
	}
	this.disable = (setting) => {
		setting.disable();
		this.update(setting.addr, new SettingsPacket(
			'disable',
			setting.addr
		));
	}
	this.enable = (setting) => {
		setting.enable();
		this.update(setting.addr, new SettingsPacket(
			'enable',
			setting.addr
		));
	}
	this.update = function(setting, packet){
		if(!packet) {
			packet = new SettingsPacket(
				'change',
				setting,
				this.getByAddr(setting).get()
			);
		}
		if(packet.type == 'set') packet.type = 'change';
		packet.handled = true;
		this.S.out('settingsPacket', packet);
	}

	this.refreshAll = function() {
    	var settings = Object.keys(this.all).map(setting => this.all[setting]);
        settings.forEach(setting => setting.refresh());
        settings.forEach(setting => {
            if(setting.condition) {
            var result = this.query(setting.condition);
                if(result) {
                    if(!setting.disabled) return;
                    this.enable(setting);
                }else{
                    if(setting.disabled) return;
                    this.disable(setting);
                }
            }
        });
    }

	this.settingUpdated = function(e) {
		if(e.type == 'change') {
			if(e.setting.postUpdate) e.setting.postUpdate(e.setting.get());
			this.refreshAll(); //opt - update only linked setting
			if(localStorage)
				localStorage.setItem('settings', this.serialize())
				this.S.out('message', e.setting.getHelp());
		}
		// if(e.silent != true) {
		// 	if(!e.notip)
		// 		if(e.type == 'change')
		// }
	}

	this.packetHandler = (packet) => {
		switch(packet.type) {
			case 'set':
				this.set(packet.setting, packet.value, packet);
				break;
			case 'cycle':
				this.cycle(packet.setting, packet.value, packet);
				break;
		}
	}


	this.S.mapIn({
		settingsPacket: this.packetHandler,
		init: this.sendInit,
		settingEvent: this.settingUpdated
	})

	this.ver = '0.79';

	this.newSetting({
		addr: 'lyt.fit',
		prettyName: 'Page fit',
		options: [
			'none',
			'all_limit',
			'width_limit',
			'height_limit',
			'all',
			'width',
			'height'
		],
		default: (IS_MOBILE)?'all_limit':'width_limit',
		strings: {
			'none': 'Images are displayed in natural resolution.',
			'all_limit': 'Natural image size that does not exceed max width or height.',
			'width_limit': 'Natural image size that does not exceed max width.',
			'height_limit': 'Natural image size that does not exceed max height.',
			'all': 'Images expand to width or height.',
			'width': 'Images expand to max width.',
			'height': 'Images expand to max height.',
		},
		help: {
			'none': 'Images are displayed in natural resolution.',
			'all_limit': 'Natural image size that does not exceed max width or height.',
			'width_limit': 'Natural image size that does not exceed max width.',
			'height_limit': 'Natural image size that does not exceed max height.',
			'all': 'Images expand to width or height.',
			'width': 'Images expand to max width.',
			'height': 'Images expand to max height.',
		},
		type: SETTING_MULTI,
		html: `<div><div class="t-row">
				<div class="t-1">
					<div class="ToggleButton" data-bind="none"><div data-bind="icon" class="ico-btn"></div><span>Original size</span></div>
				</div>
			</div><div class="t-row">
				<div class="t-tooltip">
					Limit
				</div>
				<div class="t-1">
					<div class="ToggleButton" data-bind="all_limit"><div data-bind="icon" class="ico-btn"></div><span>All</span></div>
					<div class="ToggleButton" data-bind="width_limit"><div data-bind="icon" class="ico-btn"></div><span>Width</span></div>
					<div class="ToggleButton" data-bind="height_limit"><div data-bind="icon" class="ico-btn"></div><span>Height</span></div>
				</div>
			</div><div class="t-row">
				<div class="t-tooltip">
					Stretch
				</div>
				<div class="t-1">
					<div class="ToggleButton" data-bind="all"><div data-bind="icon" class="ico-btn"></div><span>All</span></div>
					<div class="ToggleButton" data-bind="width"><div data-bind="icon" class="ico-btn"></div><span>Width</span></div>
					<div class="ToggleButton" data-bind="height"><div data-bind="icon" class="ico-btn"></div><span>Height</span></div>
				</div>
			</div></div>`
	})
	.newSetting({
		addr: 'lyt.zoom',
		prettyName: 'Maximum page width',
		options: ['10', '20', '30', '40', '50', '60', '70', '80', '90', '100'],
		default: '100',
		strings: (i) => `${i}%`,
		help: 'Maximum width the page expands to. Works only in width modes of page fit.',
		type: SETTING_VALUE_STEPPED,
		condition: {'lyt.fit': ['width_limit', 'width']},
		nomobile: true
	})
	.newSetting({
		addr: 'lyt.direction',
		prettyName: 'Reader layout',
		options: ['ltr', 'ttb', 'rtl'],
		default: 'ltr',
		strings: {
			ltr: 'Left-to-right',
			ttb: 'Top-to-bottom',
			rtl: 'Right-to-left'
		},
		help: {
			ltr: 'Left-to-right reading mode.',
			ttb: 'Vertical view.',
			rtl: 'Right-to-left reading mode.'
		},
		type: SETTING_MULTI
	})
	.newSetting({
		addr: 'lyt.gap',
		prettyName: 'Remove gaps in vertical view',
		default: false,
		strings: {
			true: 'Gaps removed',
			false: 'Gaps applied'
		},
		compact: true,
		condition: {'lyt.direction': ['ttb']},
		type: SETTING_BOOLEAN,
		global: true
	})
	.newSetting({
		addr: 'thm.theme',
		prettyName: 'Reader Theme',
		options: ['Cubari', 'Classic', 'Reaper', 'Zaibatsu', 'Light', 'Custom'],
		default: 'Cubari',
		strings: {
			Cubari: 'Cubari',
			Classic: 'Classic',
			Reaper: 'Reaper',
			Light: 'Light',
			Zaibatsu: 'Zaibatsu',
			Custom: 'Custom...'
		},
		type: SETTING_MULTI_DROPDOWN
	})
	.newSetting({
		addr: 'thm.primaryCol',
		prettyName: 'Interface Color',
		default: '#3A3F44',
		condition: {'thm.theme': ['Custom']},
		compact: true,
		global: false,
		type: SETTING_COLOR
	})
	.newSetting({
		addr: 'thm.textCol',
		prettyName: 'Text Color',
		default: '#EEEEEE',
		condition: {'thm.theme': ['Custom']},
		compact: true,
		global: false,
		type: SETTING_COLOR
	})
	.newSetting({
		addr: 'thm.accentCol',
		prettyName: 'Accent Color',
		default: '#B2DFFB',
		condition: {'thm.theme': ['Custom']},
		compact: true,
		global: false,
		type: SETTING_COLOR
	})
	.newSetting({
		addr: 'thm.readerBg',
		prettyName: 'Reader Background',
		default: '#272B30',
		condition: {'thm.theme': ['Custom']},
		compact: true,
		global: false,
		type: SETTING_COLOR
	})
	.newSetting({
		addr: 'thm.reset',
		prettyName: '',
		options: [true,false],
		default: false,
		compact: true,
		condition: {'thm.theme': ['Custom'], 'thm.primaryCol': ['!#3A3F44', 'or'], 'thm.readerBg': ['!#272B30', 'or'], 'thm.accentCol': ['!#B2DFFB', 'or'], 'thm.textCol': ['!#EEEEEE', 'or']},
		type: SETTING_BUTTON
	})
	.newSetting({
		addr: 'lyt.spread',
		prettyName: '2-page spread',
		options: ['1', '2', '2-odd'],
		default: '1',
		strings: {
			'1': '1-page layout',
			'2': '2-page layout',
			'2-odd': '2-page layout, odd'
		},
		help: {
			'1': 'Single page displayed.',
			'2': 'Two pages at once.',
			'2-odd': 'Two pages at once, odd numbering.'
		},
		type: SETTING_MULTI,
		postUpdate: value => {
			({
				'1': v => {
					this.set('adv.spreadCount', 1)
					this.set('adv.spreadOffset', 0)
				},
				'2': v => {
					this.set('adv.spreadCount', 2)
					this.set('adv.spreadOffset', 0)
				},
				'2-odd': v => {
					this.set('adv.spreadCount', 2)
					this.set('adv.spreadOffset', 1)
				}
			})[value]()
		}
	})
	.newSetting({
		addr: 'adv.spreadCount',
		prettyName: 'Spread mode custom page count',
		options: [1,2,3,4,5,6,7,8,9,10],
		default: 1,
		strings: i => {
			return '%ip'.replace('%i', i)
		},
		postUpdate: () => this.update('adv.spreadOffset'),
		type: SETTING_VALUE,
		// hidden: true
	})
	.newSetting({
		addr: 'adv.spreadOffset',
		prettyName: 'Spread mode custom page offset',
		options: () => {
			return [...Array(this.get('adv.spreadCount')).keys()]
		},
		default: 0,
		strings: i => {
			return '%ip'.replace('%i', i)
		},
		condition: {'adv.spreadCount': ['!1']},
		type: SETTING_VALUE,
		// hidden: true
	})
	.newSetting({
		addr: 'apr.selectorAnchor',
		prettyName: 'Page selector position',
		options: ['left', 'bottom'],
		default: 'left',
		strings: {
			'left': 'Left',
			'bottom': 'Bottom'
		},
		help: {
			'left': 'Page selector is shown near the sidebar.',
			'bottom': 'Page selector is at the bottom of the page.'	
		},
		type: SETTING_MULTI,
		nomobile: true
	})
	.newSetting({
		addr: 'apr.selPinned',
		prettyName: 'Pin page selector',
		default: false,
		strings: {
			true: 'Pinned',
			false: `Shown on ${IS_MOBILE?'tap':'hover'}`
		},
		compact: true,
		type: SETTING_BOOLEAN,
	})
	.newSetting({
		addr: 'apr.selNum',
		prettyName: 'Page selector: show page number',
		default: true,
		strings: {
			true: 'Show page number',
			false: 'Hide page number'
		},
		compact: true,
		type: SETTING_BOOLEAN,
	})
	.newSetting({
		addr: 'apr.hoverinos',
		prettyName: 'Mouseover reader hints (next, prev)',
		default: true,
		strings: {
			true: 'Visible',
			false: 'Hidden'
		},
		compact: true,
		type: SETTING_BOOLEAN,
		nomobile: true
	})
	.newSetting({
		addr: 'apr.sidebar',
		prettyName: 'Show sidebar',
		default: true,
		strings: {
			true: 'Show sidebar',
			false: 'Hide sidebar',
		},
		compact: true,
		type: SETTING_BOOLEAN,
		nomobile: true
	})
	.newSetting({
		addr: 'apr.previews',
		prettyName: 'Show previews',
		default: false,
		strings: {
			true: 'Show previews',
			false: 'Hide previews',
		},
		compact: true,
		type: SETTING_BOOLEAN,
		nomobile: true
	})
	.newSetting({
		addr: 'bhv.preload',
		prettyName: 'Page preload',
		options: [1,2,3,4,5,6,7,8,9,100],
		default: (IS_MOBILE)?2:3,
		strings: i => `${i}`.replace('100', '∞'),
		type: SETTING_VALUE_STEPPED,
		global: false
	})
	.newSetting({
		addr: 'bhv.scrollYDelta',
		prettyName: 'Vertical scroll speed using keyboard arrows',
		options: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
		default: 25,
		strings: i => `${i}px`,
		type: SETTING_VALUE,
		global: false,
		nomobile: true
	})
	.newSetting({
		addr: 'bhv.resetScroll',
		prettyName: 'Reset page scroll after page flip',
		default: false,
		strings: {
			true: 'Reset',
			false: 'Leave it be',
		},
		help: {
			true: 'On page switch, resets vertical scroll of the previous page.',
			false: 'Vertical scroll on pages is saved.',
		},
		compact: true,
		type: SETTING_BOOLEAN,
		global: false
	})
	.newSetting({
		addr: 'bhv.clickTurnPage',
		prettyName: `Turn pages by ${IS_MOBILE ? 'tapping' : 'clicking'}`,
		strings: {
			true: 'Turn page',
			false: 'Disabled',
		},
		help: {
			true: `When ${IS_MOBILE ? 'tapping' : 'clicking'}, the page turns depending on the direction.`,
			false: `${IS_MOBILE ? 'Tapping' : 'Clicking'} on the page does not turn it.`,
		},
		default: true,
		compact: true,
		type: SETTING_BOOLEAN,
	})
	.newSetting({
		addr: 'bhv.swipeGestures',
		prettyName: `Enable swipe gestures`,
		strings: {
			true: 'Swipe enabled',
			false: 'Swipe disabled',
		},
		help: {
			true: `Allow using finger drag to turn the pages smoothly.`,
			false: `Finger drag will do nothing. Tap on the pages or use your keyboard to advance pages.`,
		},
		default: true,
		compact: true,
		postUpdate: (state) => {
			if(typeof Reader !== "undefined") {
				Reader.imageView.setTouchHandlers(state);
			}
		},
		type: SETTING_BOOLEAN,
	})
	.newSetting({
		addr: 'bhv.historyUpdate',
		prettyName: 'Browser history/back button behavior',
		options: ['none','replace','chap','jump', 'all'],
		default: 'replace',
		strings: {
			'none': "Don't touch browser history",
			'replace': "Just change the page title",
			'chap': "Add every chapter to history",
			'jump': "Add every chapter and page&nbsp;skips",
			'all': "Add every move to history"
		},
		help: {
			'none': "Page URL and title won't update at all.",
			'replace': "When you go to next chapter, page title and URL changes.",
			'chap': "Remembers chapters in browser history so you can go back with browser buttons.",
			'jump': "Also adds out-of-order page skips to history in addition to chapters.",
			'all': "Add every page flip to browser history."
		},
		type: SETTING_MULTI,
		global: false
	})
	.newSetting({
		addr: 'misc.groupPreference',
		prettyName: 'Group preference',
		type: SETTING_VALUE,
		hidden: true,
		global: false
	})
	.newSetting({
		addr: "adv.parallelDownloads",
		prettyName: "Number of parallel image downloads",
		options: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
		default: 5,
		type: SETTING_VALUE,
		hidden: false,
	});
	this.deserialize();
	this.sendInit();
}

function SettingsPacket(type, settingAddr, value, source) {
	this.type = type;
	this.setting = settingAddr;
	this.value = value;
	this.source = source;
	return this;
}


function UI_Loda_Settings(o) {
	o=be(o);
	UI_Loda.call(this, {
		node: o.node,
		kind: ['Loda_Settings'].concat(o.kind || []),
		name: 'Settings',
		html: o.html || `<div class="Loda-window UI Loda Loda_Settings" tabindex="-1">
			<aside>
				<button class="ico-btn close" data-bind="close"></button>
				<header data-bind="header">Settings</header>
				<div class="settings-tabs" data-bind="tabs">
				</div>
			</aside>
			<content data-bind="content">
			</content>
		</div>`
	});
	this.focusElement = this.$;
	this.manager = o.manager;
	this.name = 'Settings';
	this.noPropagation = false;

	this.content = new UI_ContainerList({
		node: this._.content
	});
	this.tabs = new UI_Tabs({
		node: this._.tabs
	}).S.link(this.content);

	this.createCategory = (tabName, content) => {
		this.tabs.add(new UI_IconTab({
			text: tabName
		}));
		this.content.add(content);
		return this;
	} 

	for(let category in Settings.settings) {
		if(Settings.settings[category].hidden) continue;
	var container = new UI_Dummy();
		for(let setting in Settings.settings[category]) {
			if(Settings.settings[category][setting].hidden) continue;
		let sU = new UI_SettingUnit({
				setting: Settings.settings[category][setting]
			});
			Settings.S.link(sU);
			container.$.appendChild(sU.$);
		}
		this.createCategory(Settings.settings[category].name, container);
	}

	this.tabs.select(0);
}

function UI_SettingUnit(o) {
	o=be(o);
	Linkable.call(this);
	UI.call(this, {
		node: o.node,
		kind: ['SettingUnit'].concat(o.kind || []),
		name: 'SettingUnit',
		html: o.html || `
		<div class="setting-wrapper">
			<header class="setting-header" data-bind="header"></header>
			<div class="setting-field" data-bind="field"></div>
		</div>`
	});

	this.setting = o.setting;

	this._.header.innerHTML = this.setting.prettyName;
	this.controls = new UI_SettingDisplay({
		node: this._.field,
		setting: this.setting
	})

	this.packetHandler = (packet) => {
		if(packet.setting != this.setting.addr) return;
		if(packet.type == 'disable')
			this.hide();
		else if(packet.type == 'enable')
			this.show();
	}
	this.hide = () => {
		this._.header.classList.add('disabled');
		this._.field.classList.add('disabled');
	}
	this.show = () => {
		this._.header.classList.remove('disabled');
		this._.field.classList.remove('disabled');
	}

	if(this.setting.disabled)
		this.hide()

	if(this.setting.nomobile)
		this.$.classList.add('nomobile');

	if(this.setting.compact)
		this.$.classList.add('compact');

	this.S.mapIn({
		settingsPacket: this.packetHandler
	})
}

function UI_SettingDisplay(o) {
	o=be(o);
	UI.call(this, Object.assign(o, {
		kind: ['SettingDisplay'].concat(o.kind || [])
	}));
	this.setting = o.setting;
	this.disabled = o.disabled || false;
	this.entity = null;
	switch(this.setting.type) {
		case SETTING_MULTI:
		case SETTING_BOOLEAN:
			this.entity = new UI_ButtonGroup({
				html: this.setting.html,
				setting: this.setting
			}).S.biLink(Settings);
			break;
		case SETTING_VALUE:
		case SETTING_VALUE_STEPPED:
			this.entity = new UI_Slider({
				setting: this.setting
			}).S.biLink(Settings);
			break;
		case SETTING_COLOR:
			this.entity = new UI_ColorPicker({
				setting: this.setting
			}).S.biLink(Settings);
			break;
		case SETTING_BUTTON: 
			this.entity = new UI_ResetButton({
				setting: this.setting,
				html: `<button class="reset-btn"></button>`,
				text: 'Reset'
			}).S.link(Settings);
			break;
		case SETTING_MULTI_DROPDOWN:
		this.entity = new UI_Dropdown({
			setting: this.setting,
			options: this.setting.optionsPrimitive,
			disabled: false
		}).S.link(Settings);
		break;
	}


	if(this.entity) this.$.appendChild(this.entity.$);

	return this;
}