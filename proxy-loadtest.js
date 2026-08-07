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

function getProxies(file) {
    if (!fs.existsSync(file)) return []
    return fs.readFileSync(file, 'utf-8').split('\n').map(s => s.trim()).filter(Boolean)
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

    // jangan pake 139rb sekaligus, ambil 100 aja biar stabil
    const useProxies = proxies.slice(0, 100) 
    console.log(`\x1b[32m[+] Loaded ${proxies.length} proxies. Dipake: ${useProxies.length}\x1b[0m`)

    let i = 0
    const instance = autocannon({
        url: target,
        connections: parseInt(connections),
        duration: parseInt(duration),
        pipelining: parseInt(rps),
        timeout: 15,
        renderStatusCodes: true,
        
        // ini cara benernya: bikin agent baru tiap koneksi
        setupClient: (client) => {
            const proxy = useProxies[i % useProxies.length]
            i++
            client.opts.agent = new HttpsProxyAgent(`http://${proxy}`)
            console.log(`\x1b[33mProxy: ${proxy}\x1b[0m`)
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
        console.log(`2xx: ${result['2xx']}  4xx: ${result['4xx']}  5xx: ${result['5xx']}`)
        console.log(`Errors: ${result.errors}  Timeouts: ${result.timeouts}`)
    }
}

main()
