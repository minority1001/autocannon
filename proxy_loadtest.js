const autocannon = require('autocannon')
const { HttpsProxyAgent } = require('https-proxy-agent')
const fs = require('fs')
const readline = require('readline')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function question(q) {
    return new Promise(resolve => rl.question(q, resolve))
}

// ambil proxy random dari file
function getProxies(file) {
    if (!fs.existsSync(file)) return []
    return fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean)
}

async function main() {
    console.log('\x1b[36m=== AUTOCANNON + PROXY LOAD TEST ===\x1b[0m\n')
    
    const target = await question('Target URL: ')
    const duration = await question('Durasi detik: ')
    const connections = await question('Jumlah Koneksi: ')
    const rps = await question('RPS per koneksi: ')
    const proxyFile = await question('File Proxy [proxy.txt]: ') || 'proxy.txt'

    rl.close()

    const proxies = getProxies(proxyFile)
    if (proxies.length === 0) {
        console.log('\x1b[31mProxy.txt kosong atau tidak ditemukan\x1b[0m')
        process.exit(1)
    }

    console.log(`\x1b[32m[+] Loaded ${proxies.length} proxies\x1b[0m`)

    let count = 0
    const instance = autocannon({
        url: target,
        connections: parseInt(connections),
        duration: parseInt(duration),
        pipelining: parseInt(rps),
        timeout: 10,
        renderStatusCodes: true,
        
        // ini kuncinya: ganti agent tiap request
        setupClient: (client) => {
            client.on('request', () => {
                const proxy = proxies[count % proxies.length]
                count++
                client.setAgent(new HttpsProxyAgent(`http://${proxy}`))
            })
        }
    }, finished)

    autocannon.track(instance, { renderProgressBar: true })

    function finished(err, result) {
        if (err) return console.error(err)
        console.log('\n\x1b[32m=== HASIL TEST ===\x1b[0m')
        console.log(`Target: ${result.url}`)
        console.log(`Total Requests: ${result.requests.total}`)
        console.log(`RPS Avg: ${result.requests.average}`)
        console.log(`Latency Avg: ${result.latency.average} ms`)
        console.log(`Errors: ${result.errors}`)
        console.log(`Timeouts: ${result.timeouts}`)
        console.log(`\x1b[33mProxy Dipake: ${count}\x1b[0m`)
    }
}

main()
