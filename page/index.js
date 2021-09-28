console.log(chrome.runtime?.id)


const browser = (() => {
  // const browser = { storage: {} }

  // for (const name of ['storage']) {
  //   browser[name] = {}
  //   for (const [key, value] of Object.entries(chrome[name] || {})) {
  //     browser[name][key] = (...args) => new Promise(resolve => value?.(...args, resolve))
  //   }
  // }

  // for (const name of ['sync', 'local']) {
  //   browser.storage[name] = {}
  //   for (const [key, value] of Object.entries(chrome.storage?.[name] || {})) {
  //     browser.storage[name][key] = (...args) => new Promise(resolve => value?.(...args, resolve))
  //   }
  // }

  const browser = { storage: { local: {}, sync: {} } }
  browser.storage.local.get           = (...args) => new Promise(resolve => chrome.storage.local.get          (...args, resolve))
  browser.storage.local.getBytesInUse = (...args) => new Promise(resolve => chrome.storage.local.getBytesInUse(...args, resolve))
  browser.storage.sync .get           = (...args) => new Promise(resolve => chrome.storage.sync .get          (...args, resolve))
  browser.storage.sync .getBytesInUse = (...args) => new Promise(resolve => chrome.storage.sync .getBytesInUse(...args, resolve))

  return browser
}) ()


// [タイムスタンプからユニークなIDを生成](https://masa-enjoy.com/javascript-timestamp-unique)
const createUniqueId = () => new Date().getTime().toString(16)

const copyTextToClipboard = text => {
  const elem = document.createElement('textarea')
  elem.textContent = text
  document.body.appendChild(elem)
  elem.select()
  document.execCommand('copy')
  elem.blur() // (Optional) De-select the text using blur().
  document.body.removeChild(elem)
}


Vue.component('editor', {
  template: `<div @keydown="$event.stopPropagation()">
    <div ref="editor" style="width: 100%; height: 100%; overflow: hidden;"></div>
  </div>`,
  props: [ 'value', 'language' ],
  data () {
    return {
      editor: null,
    }
  },
  watch: {
    language () {
      monaco.editor.setModelLanguage(this.editor.getModel(), this.language)
    },
  },
  mounted () {
    console.log('@editor.mounted')
    const editor = monaco.editor.create(this.$refs.editor, {
      value: this.value,
      language: this.language ?? 'javascript',
      // theme: 'vs-dark',
      theme: 'vs-light',
      automaticLayout: true,
      minimap: { enabled: false },
      tabSize: this.language === 'python' ? 4 : 2,
    })
    editor.onDidChangeModelContent(event => {
      // console.log(event)
      // console.log(editor.getValue())
      this.$emit('update:value', editor.getValue())
      this.$emit('change', editor.getValue())
    })
    this.editor = editor
  },
})


const app = new Vue({
  el: '#app',
  data: {
    items: [
      // { id: '123', language: 'javascript', text: `// test\nlet a = 0` },
      // { id: 'abc', language: 'python', text: `# test\ndef(x, y):\n    return x + y` },
    ],
    //
    itemsLayout: 'list',
    //
    filter: { text: '', usesRegExp: false },
    //
  },
  computed: {
    filteredItems () {
      return this.items
      // return this.items.filter(item => item.title.includes(this.filter.text) || item.url.includes(this.filter.text))
    },
  },
  async mounted () {
    await this.refreshItems()
    if (this.items.length === 0) this.addNewItem()
  },
  methods: {
    log: console.log,
    async debug () {
      console.log(
        'local',
        await browser.storage.local.get(null),
        await browser.storage.local.getBytesInUse(null),
      )
      console.log(
        'sync',
        await browser.storage.sync.get(null),
        await browser.storage.sync.getBytesInUse(null),
      )
    },
    //
    toTitle (item) {
      return item.text.match(/^\/\/ +?(.*)\n?/)?.[1]
    },
    saveItem (item) {
      chrome.storage.sync.set({ [item.id]: item })
    },
    // ***in header...
    addNewItem () {
      const newItem = {
        id: createUniqueId(),
        language: 'javascript',
        text: '',
      }
      this.saveItem(newItem)
      this.items = [ newItem, ...this.items ]
    },
    // move focused item to up/down
    // download, upload
    downloadItems () {
      const text = JSON.stringify(this.items, null, 2)
      // See [JavaScriptで動的に作成したテキストファイルをダウンロード - Qiita](https://qiita.com/ledsun/items/93b0965c9720e0baf81c)
      const a = document.createElement('a')
      a.download = 'mysnippets.json'
      a.href = `data:application/json;charset=UTF-8,${text}`
      a.click()
    },
    async refreshItems () {
      this.items = Object.values(await browser.storage.sync.get())
    },
    // n columns
    // ***for each item...
    copy (text) {
      copyTextToClipboard(text)
    },
    deleteItem (id) {
      chrome.storage.sync.remove(id)
      this.items = this.items.filter(item => item.id !== id)
    },
    //
    focusItem (index) {
      index = Math.max(index, 0)
      index = Math.min(index, this.items.length - 1)
      document.querySelector(`.item[index="${index}"]`).focus()
    },
    onkeydown (event) {
      const computedStyle = window.getComputedStyle(document.querySelector('.items'))
      const gridColumnCount = computedStyle.getPropertyValue('grid-template-columns').split(' ').length
      // NOTE: display: flex; の場合も ['none'].length = 1 となりOK
      const shift = event.key === 'ArrowRight' ? 1
        :           event.key === 'ArrowLeft'  ? -1
        :           event.key === 'ArrowUp'    ? -gridColumnCount
        :           event.key === 'ArrowDown'  ? gridColumnCount
        :           0
      const index = Number(event.target.getAttribute('index'))
      this.focusItem(index + shift)
    },
  },
})




// let editor = monaco.editor.create(document.getElementById('e'), {
//   value: `function x() {\n  console.log("Hello world!")\n}`,
//   language: 'javascript',
//   theme: 'vs-dark',
//   automaticLayout: true,
// })
// editor.onDidChangeModelContent(event => {
//   console.log(event)
//   console.log(editor.getValue())
// })