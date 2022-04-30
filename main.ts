import { Plugin, MarkdownRenderChild, MarkdownRenderer, PluginSettingTab, App, Setting } from 'obsidian';

const COLUMNNAME = "col"
const COLUMNMD = COLUMNNAME + "-md"
const TOKEN = "!!!"

interface settingItem<T> {
	value: T
	name?: string
	desc?: string
}

interface columnSettings {
	wrapSize: settingItem<number>
}

const DEFAULT_SETTINGS: columnSettings = {
	wrapSize: { value: 100, name: "Minimum width of column", desc: "Columns will have this minimum width before wrapping to a new row. 0 disables column wrapping. Useful for smaller devices"}
}

let parseBoolean = (value: string) => {
	return (value == "yes" || value == "true")
}

let parseObject = (value: any, typ: string) => {
	if (typ == "string") {
		return value
	}
	if (typ == "boolean") {
		return parseBoolean(value)
	}
	if (typ == "number") {
		return parseFloat(value)
	}
}

export default class ObsidianColumns extends Plugin {

	settings: columnSettings;

	async onload() {

		await this.loadSettings();
		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor(COLUMNMD, (source, el, ctx) => {
			const sourcePath = ctx.sourcePath;
			let child = el.createDiv();
			MarkdownRenderer.renderMarkdown(
				source,
				child,
				sourcePath,
				null
			);
		});

		this.registerMarkdownCodeBlockProcessor(COLUMNNAME, (source, el, ctx) => {
			const sourcePath = ctx.sourcePath;
			let rows = source.split("\n");
			let child = createDiv();
			MarkdownRenderer.renderMarkdown(
				source,
				child,
				sourcePath,
				null
			);
			let parent = el.createEl("div", { cls: "columnParent" });
			Array.from(child.children).forEach((c) => {
				let cc = parent.createEl("div", { cls: "columnChild" })
				cc.setAttribute("style", "flex-grow:1; flex-basis:" + this.settings.wrapSize.value.toString() + "px")
				cc.appendChild(c)
			})
		});

		let processList = (element: Element) => {
			for (let child of Array.from(element.children)) {
				if (child == null) {
					continue
				}
				if (child.nodeName != "UL" && child.nodeName != "OL") {
					continue
				}
				for (let listItem of Array.from(child.children)) {
					if (listItem == null) {
						continue
					}
					if (!listItem.textContent.trim().startsWith(TOKEN + COLUMNNAME)) {
						processList(listItem)
						continue
					}
					child.removeChild(listItem)
					let colParent = element.createEl("div", { cls: "columnParent" })
					let itemList = listItem.querySelector("ul, ol")
					if (itemList == null) {
						continue
					}
					for (let itemListItem of Array.from(itemList.children)) {
						let childDiv = colParent.createEl("div", { cls: "columnChild" })
						let span = parseFloat(itemListItem.textContent.split("\n")[0].split(" ")[0])
						if (isNaN(span)) {
							span = 1
						}
						childDiv.setAttribute("style", "flex-grow:" + span.toString() + "; flex-basis:" + (this.settings.wrapSize.value * span).toString() + "px")
						let afterText = false
						processList(itemListItem)
						for (let itemListItemChild of Array.from(itemListItem.childNodes)) {
							if (afterText) {
								childDiv.appendChild(itemListItemChild)
							}
							if (itemListItemChild.nodeName == "#text") {
								afterText = true
							}
						}
					}
				}
			}
		}

		this.registerMarkdownPostProcessor((element, context) => { processList(element) });
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: ObsidianColumns;

	constructor(app: App, plugin: ObsidianColumns) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Settings for obsidian-columns' });

		let keyvals = Object.entries(DEFAULT_SETTINGS)

		console.log(keyvals)

		for (let keyval of keyvals) {
			new Setting(containerEl)
				.setName(keyval[1].name)
				.setDesc(keyval[1].desc)
				.addText(text => text
					.setPlaceholder(String(keyval[1].value))
					.setValue(String((this.plugin.settings as any)[keyval[0]].value))
					.onChange((value) => {
						keyval[1].value = parseObject(value, typeof keyval[1].value);
						this.plugin.saveSettings();
					}));
		}
	}
}