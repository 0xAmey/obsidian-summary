const {
  Plugin,
  PluginSettingTab,
  moment,
  Menu,
  Notice,
  Setting,
} = require("obsidian");

class SummaryPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SummarySettingTab(this.app, this));
    this.addButtonToSidebar();
  }

  async loadSettings() {
    this.settings = Object.assign(
      {},
      this.defaultSettings,
      await this.loadData()
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  get defaultSettings() {
    return {
      openAiApiKey: "",
      poeCookie: "",
      model: "gpt-3.5",
    };
  }

  addButtonToSidebar() {
    this.addRibbonIcon("file-text", "Summarize", (evt) => {
      const summaryMenu = new Menu(this.app);

      summaryMenu.addItem((item) => {
        item.setTitle("Summarize this page").onClick(() => {
          this.summarizeCurrentPage();
        });
      });

      // summaryMenu.addItem((item) => {
      //   item.setTitle("Summarize recently modified pages").onClick(() => {
      //     this.summarizeModifiedLastWeek();
      //   });
      // });

      summaryMenu.showAtPosition({ x: evt.clientX, y: evt.clientY });
    });
  }

  async summarizeCurrentPage() {
    const activeFile = this.app.workspace.getActiveFile();

    if (activeFile) {
      const activeLeaf = this.app.workspace.activeLeaf;
      const fileView = activeLeaf.view;
      const editor = fileView.editor;
      const content = editor.getValue();
      // console.log(content);
      await this.createSummaryFile("Loading...");
      const response = await fetch("http://127.0.0.1:5000/api/gpt/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content,
        }),
      });

      if (response.ok) {
        const overallSummary = await response.text();
        await this.createSummaryFile(overallSummary);
      } else {
        new Notice("Error: Could not generate summary");
      }
    } else {
      new Notice("No active file to summarize.");
    }
  }

  async createSummaryFile(summary) {
    const app = this.app;
    const currentFile = app.workspace.getActiveFile();
    const currentFilename = currentFile.basename;
    const vault = app.vault;
    const newFilename = `Summary ${currentFilename}.md`;

    // Check if the file already exists
    let newFile = vault.getAbstractFileByPath(newFilename);
    if (!newFile) {
      // Create the new file
      newFile = await vault.create(newFilename, summary);
    } else {
      // Overwrite the existing file
      await vault.modify(newFile, summary);
    }

    // Open the new file in the editor
    app.workspace.activeLeaf.openFile(newFile);
  }

  summarizeModifiedLastWeek() {
    const fileList = this.app.vault.getFiles();
    const lastWeek = moment().subtract(7, "days");
    const modifiedLastWeek = fileList.filter((file) =>
      moment(file.stat.mtime).isAfter(lastWeek)
    );

    // Implement your summarization logic here
    console.log(
      "Summarize recently modified pages",
      modifiedLastWeek.map((file) => file.basename)
    );
  }
}

class SummarySettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Summary Plugin Settings" });

    new Setting(containerEl)
      .setName("OpenAi API Key")
      .setDesc("Enter your OpenAi API Key")
      .addText((text) =>
        text
          .setPlaceholder("Enter your API Key")
          .setValue(this.plugin.settings.openAiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.openAiApiKey = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Poe Cookie")
      .setDesc("Enter your Poe Cookie")
      .addText((text) =>
        text
          .setPlaceholder("Enter your Poe Cookie")
          .setValue(this.plugin.settings.poeCookie)
          .onChange(async (value) => {
            this.plugin.settings.poeCookie = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Model Selection")
      .setDesc("Choose the language model")
      .addDropdown((dropdown) => {
        dropdown.addOption("gpt-3.5", "Use GPT-3.5");
        dropdown.addOption("claude-100k", "Use Claude-100k");
        dropdown.addOption("claude", "Use Claude");
        dropdown.setValue(this.plugin.settings.model || "gpt-3.5");
        dropdown.onChange(async (value) => {
          this.plugin.settings.model = value;
          await this.plugin.saveSettings();
        });
      });
  }
}

module.exports = SummaryPlugin;
