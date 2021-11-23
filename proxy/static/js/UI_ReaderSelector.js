function UI_ReaderSelector(o) {
	UI.call(this, {
		o: o,
		html: `
			<div data-bind="vol" class="rdr-vol-wrap">
				<span class="rdr-vol-number"></span>
			</div>
			<div data-bind="chap" class="rdr-chap-wrap">
				<span data-bind="chap_number" class="rdr-chap-number"></span>
				<span data-bind="chap_title" class="rdr-chap-title"></span>
			</div>
			<button data-bind='prev' class="rdr-selector-chap ico-btn prev"></button>
			<button data-bind='next' class="rdr-selector-chap ico-btn next"></button>
		`
	})
	Linkable.call(this);

	this.render = (data) => {
		console.log(data)
	}

	this.S.mapIn({
		data: this.render
	})
}

function UI_Dropdown() {

}