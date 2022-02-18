const ALGOD_PORT = 4001;
const KMD_PORT = 4002;
const TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SERVER = 'http://127.0.0.1';

const algod = new algosdk.Algodv2(TOKEN, SERVER, ALGOD_PORT);
const kmd = new algosdk.Kmd(TOKEN, SERVER, KMD_PORT)

const displayAddress = addr => `${addr.substr(0,4)}...${addr.substr(-4,4)}`
const displayBalance = bal => (bal / 1000000).toFixed(4)

// Account Info
;(async function updateUI() {
  const { wallets } = await kmd.listWallets();
  const walletSelect = document.querySelector("#walletSelect")
  for ({ id, name } of wallets) {
    name = (name === "unencrypted-default-wallet") ? "Default Wallet" : name
    const option = `<option disabled value=${id}>${name}</option>`
    walletSelect.insertAdjacentHTML('beforeend', option)
    
    const { wallet_handle_token } = await kmd.initWalletHandle(id, '')
    const { addresses } = await kmd.listKeys(wallet_handle_token)
    for (addr of addresses) {
      const info = await algod.accountInformation(addr).do()
      const option = `<option value=${addr}>
        ${displayAddress(addr)} ${displayBalance(info.amount)} ALGO
      </option>`
      walletSelect.insertAdjacentHTML('beforeend', option)
    }
  }
})().catch((e) => {
  console.log(e);
})

async function accountBalance() {
  const walletId = document.getElementById("walletSelect").value
  const { wallet_handle_token } = await kmd.initWalletHandle(walletId, '')
  const wallet = await kmd.getWallet(wallet_handle_token)
  const { addresses } = await kmd.listKeys(wallet_handle_token)

  for (addr of addresses) {
    const info = await algod.accountInformation(addr).do()
    console.log(`${info.address} balance: ${info.amount} microAlgos\n`)
  }
}

async function accountInfo() {
  // TODO: Dedupe code
  const walletId = document.getElementById("walletSelect").value
  const { wallet_handle_token } = await kmd.initWalletHandle(walletId, '')
  const wallet = await kmd.getWallet(wallet_handle_token)
  const { addresses } = await kmd.listKeys(wallet_handle_token)

  for (addr of addresses) {
    const info = await algod.accountInformation(addr).do()
    console.log(`${JSON.stringify(info)}\n`)
  }
}

// TODO: Secret Key display / storage
async function generateAlgorandKeypair() {
  const result = await algosdk.generateAccount()
  const mnemonic = await algosdk.secretKeyToMnemonic(result.sk)
  console.log(`Generated account: ${result.addr}\nMnemonic: ${mnemonic}`)
}

async function getClientStatus() {
  const client_status = await algod.status().do();
  console.log('Client status: \n')
  for (k of Object.keys(client_status)) {
    console.log(`${k}: ${client_status[k]}\n`);
  }
}

function processFile() {
  const payload = document.getElementById('payload')

  var reader = new FileReader();
  reader.onload = function() {
    const arrayBuffer = this.result
    const array = new Uint8Array(arrayBuffer)
    console.log(array)
  }

  console.log(payload);
  reader.readAsArrayBuffer(payload.files[0]);
}

function updateFragments() {
  document.querySelectorAll(".fragments g").forEach(el => {
    el.classList.remove('selected')
  })

  const svgGroupId = document.getElementById('numFragments').value
  const svgGroup = document.getElementById(svgGroupId)
  svgGroup.classList.toggle("selected")

  const minVouchers = document.getElementById('minVouchers').value
  const fragments = svgGroup.querySelectorAll('polygon');
  fragments.forEach(el => el.classList.remove('trustee'))
  for (let i = 0; i < minVouchers; i++) {
    fragments[i].classList.add('trustee')
  }
}