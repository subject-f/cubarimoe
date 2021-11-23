
function themeHandler() {
	Linkable.call(this);
	this.themeUpdated = () => {
		let reset = Settings.get('thm.reset');
		let theme = Settings.get('thm.theme');
		if(theme === 'Custom')	this.setTheme(Settings.get('thm.primaryCol'), Settings.get('thm.readerBg'), Settings.get('thm.accentCol'), Settings.get('thm.textCol'));
		else if (theme === 'Cubari') this.setTheme('#28292B', '#000000', '#B73636','#EEEEEE');
		else if (theme === 'Classic') this.setTheme('#3a3f44', '#272b30', '#b2dffb','#eeeeee');
		else if (theme === 'Reaper') this.setTheme('#272836', '#121223', '#487DE4', '#EEEEEE');
		else if (theme === 'Zaibatsu') this.setTheme('#1D1D1D', '#000000', '#BA1F1F', '#EEEEEE');
		else if (theme === 'Light') this.setTheme('#F1F4FF', '#FFFFFF', '#5889F0','#2B2B2B');
		if(reset === true) this.resetCustom();
	}
	this.setTheme = (sidebar, reader, accent, text) => {
		document.documentElement.style.setProperty("--readerBg", reader);
		document.documentElement.style.setProperty("--sidebarCol", sidebar);
		document.documentElement.style.setProperty("--accentCol", accent);
		document.documentElement.style.setProperty("--textCol", text);
		document.documentElement.style.setProperty("--icoCol", text);
		document.documentElement.style.setProperty("--sidebarColDark", colManipulate(sidebar, -15));
		document.documentElement.style.setProperty("--sidebarColDarkA", colManipulate(sidebar, -15) + '00');
		document.documentElement.style.setProperty("--prevCol", colManipulate(sidebar, -7));

		let [r, g, b] = hexToRgb(accent);
		var	luma = ((r*299)+(g*587)+(b*114))/1000;

		document.documentElement.style.setProperty("--accentSelected", (luma > 160?'#111111':'#ffffff'));
		
		[r, g, b] = hexToRgb(sidebar);
		luma = ((r*299)+(g*587)+(b*114))/1000;

		document.documentElement.style.setProperty("--accentSelectedInvert", (luma < 160?'#444444':'#cccccc')); // Play with 160 there if you want.
		if(luma > 100) { //Tweaks if theme is light
			document.documentElement.style.setProperty("--borderColor", "rgba(0,0,0,0.2)");
			document.documentElement.style.setProperty("--blackLight", "rgba(0,0,0,0.05)");
			document.documentElement.style.setProperty("--sidebarColFocus", colManipulate(sidebar, -24));
		} else {
			document.documentElement.style.setProperty("--borderColor", "rgba(0,0,0,0.7)");
			document.documentElement.style.setProperty("--blackLight", "rgba(0,0,0,0.2)");
			document.documentElement.style.setProperty("--sidebarColFocus", colManipulate(sidebar, -27));
		}
		[r, g, b] = hexToRgb(sidebar)
		let [rt, gt, bt] = hexToRgb(text)
		if(Math.abs(r-rt) < 50
		&& Math.abs(g-gt) < 50
		&& Math.abs(b-bt) < 50) {
			if(luma > 200) {
				document.documentElement.style.setProperty("--rescueShade", '0px 1px 1px rgba(0,0,0,0.6),0px -1px 1px rgba(0,0,0,0.6),-1px 0px 1px rgba(0,0,0,0.6),1px 0px 1px rgba(0,0,0,0.6)');
			}else{
				document.documentElement.style.setProperty("--rescueShade", '0px 1px 1px rgba(255,255,255,0.6),0px -1px 1px rgba(255,255,255,0.6),-1px 0px 1px rgba(255,255,255,0.6),1px 0px 1px rgba(255,255,255,0.6)');
			}
			// Tooltippy.set('Contrast ratio too low, safety outline enabled.')
		}else{
			document.documentElement.style.setProperty("--rescueShade", 'unset');
			// Tooltippy.reset();
		}

		[r, g, b] = hexToRgb(reader);
		luma = ((r*299)+(g*587)+(b*114))/1000;
		
		if(luma > 100) {
			document.documentElement.style.setProperty("--rdrBorderL", "3px");
			document.documentElement.style.setProperty("--rdr-wb", "1px");
			document.documentElement.style.setProperty("--blackFlag", "rgba(0,0,0,0.3)");
			document.documentElement.style.setProperty("--rdrAncBottomWhite", "rgba(255,255,255,0.6)");
		} else {
			document.documentElement.style.setProperty("--rdrBorderL", "1px");
			document.documentElement.style.setProperty("--rdr-wb", "2px");
			document.documentElement.style.setProperty("--blackFlag", "rgba(0,0,0,0.7)");
			document.documentElement.style.setProperty("--rdrAncBottomWhite", "rgba(255,255,255,0.35)");
		}
	}

	this.resetCustom = () => {
		Settings.set('thm.reset', false);
		if(Settings.get('thm.theme') === 'Custom') {
			Settings.set('thm.primaryCol', '#28292B');
			Settings.set('thm.readerBg', '#000000');
			Settings.set('thm.accentCol', '#B73636');
			Settings.set('thm.textCol', '#EEEEEE');
		}
	}
	
	// this.S.mapIn({
	// 	settingsPacket: this.themeUpdated,
	// })
}