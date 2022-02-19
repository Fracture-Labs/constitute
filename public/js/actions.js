const ALGOD_PORT = 4001;
const KMD_PORT = 4002;
const TOKEN = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SERVER = 'http://127.0.0.1';
// THIS NEEDS TO BE CHANGED PER DEPLOY
const APP_ID = 1

const algod = new algosdk.Algodv2(TOKEN, SERVER, ALGOD_PORT);
const kmd = new algosdk.Kmd(TOKEN, SERVER, KMD_PORT)

const displayAddress = addr => `${addr.substr(0,4)}...${addr.substr(-4,4)}`
const displayBalance = bal => (bal / 1000000).toFixed(4)
const walletAddresses = []

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
      walletAddresses.push(addr)
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

async function accountInfo() {
  // TODO: Dedupe code
  const addr = document.getElementById("walletSelect").value
  const info = await algod.accountInformation(addr).do()
  console.log(`${JSON.stringify(info)}\n`)
}

async function wait(txId){
		return await algodsdk.waitForConfirmation(txId)
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

function pollPayloads() {
  setInterval(async () => {
    const res = await fetch("http://localhost:8010/proxy/status", {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const status = await res.json()
    const payloadList = document.getElementById('payloadList')
    payloadList.innerHTML = ''

    const payloadRow = `<tr>
          <td>${displayAddress(status.d_ciphertext_cid)}</td>
          <td>
            <button
              class="btn"
              data-capsule-cid="${status.d_capsule_cid}
              data-ciphertext-cid="${status.d_ciphertext_cid}
              ${status.can_decrypt === "true" ? "" : "disabled"}
              >Decrypt
            </button>
          </td>
        </tr>`

    document.getElementById('k_pk').innerHTML = displayAddress(status.wallet_address)
    payloadList.insertAdjacentHTML('beforeend', payloadRow)
  }, 5000)
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

function sendEncryptPayload() {
  var reader = new FileReader();
  const payload = document.getElementById('payload').files[0]
  console.log(payload)

  var bytes = [];
  reader.onload = async function () {
    bytes = reader.result
    let hexEncoded = '';

    new Uint8Array(bytes).forEach(c => {
      hexEncoded += c.toString(16).padStart(2, "0")
    })

    let sender = document.getElementById("walletSelect").value
    const response = await fetch('http://127.0.0.1:8000/encrypt', {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json'
      },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({
        plaintext: hexEncoded,
		    wallet_address: sender,
		    app_id: APP_ID
      })
    });
	  console.log("Encrypt endpoint: ", response)

    const minVouchers = document.getElementById('minVouchers').value
    const trustees = []
    const svgGroupId = document.getElementById('numFragments').value
    const svgGroup = document.getElementById(svgGroupId)
    const fragments = svgGroup.querySelectorAll('polygon');
    for (let i = 0; i < fragments.length; i++) {
      k = fragments[i].dataset.publicKey
      trustees.push(k)
    }
    console.log("trustees: ", trustees)
    const suggestedParams = await algod.getTransactionParams().do();

    sender = document.getElementById("walletSelect").value
    const {wallets} = await kmd.listWallets()
    const { wallet_handle_token } = await kmd.initWalletHandle(wallets[0]["id"], '')
    const threshold = parseInt(minVouchers)
    const appArgs = new Uint8Array([threshold])
    const optInTxn = algosdk.makeApplicationOptInTxn(
      sender,
      suggestedParams,
      APP_ID,
      [appArgs],
      trustees,
    );
    // send the transaction
    const signedOptInTxn = await kmd.signTransaction(wallet_handle_token, '', optInTxn);
    const { txId } = await algod.sendRawTransaction(signedOptInTxn).do();
	  console.log("new web of trust txId: ", txId )
   };

   reader.readAsArrayBuffer(payload);

}

async function approveDecrypt() {

    const suggestedParams = await algod.getTransactionParams().do();
    const sender = document.getElementById("walletSelect").value;
    const delegatee = document.getElementById("k_pk").dataset.address;
    console.log(delegatee) 
    const {wallets} = await kmd.listWallets();
    const { wallet_handle_token } = await kmd.initWalletHandle(wallets[0]["id"], '');
    const noOpCall = [] 
	const noOpCallname = "reqKfrags";
    for (var i = 0; i < noOpCallname.length; i++){  
        noOpCall.push(noOpCallname.charCodeAt(i));
    }
    const appArg0 = new Uint8Array(noOpCall)
    const noOptTx = algosdk.makeApplicationNoOpTxn(
       sender,
 	   suggestedParams,
	   APP_ID,
       [appArg0],
	   [delegatee],
 	);
    // send the transaction
    const signedNoOptTx = await kmd.signTransaction(wallet_handle_token, '', noOptTx);
    const { txId } = await algod.sendRawTransaction(signedNoOptTx).do();
	console.log("txId: ", txId )

    // Wait for a few seconds then hit the set_cfrag on kfraas

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
  fragments.forEach(el => {
	el.classList.remove('trustee')
	el.dataset.publicKey = walletAddresses.pop()
  })
  for (let i = 0; i < minVouchers; i++) {
    fragments[i].classList.add('trustee')
  }
}

