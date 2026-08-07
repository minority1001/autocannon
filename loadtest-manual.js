const autocannon = require('autocannon')
const readline = require('readline')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function question(q) {
    return new Promise(resolve => rl.question(q, resolve))
}

async function main() {
    console.log('\x1b[36m=== AUTOCANNON MANUAL INPUT ===\x1b[0m\n')

    const target = await question('Target URL: ')
    const method = await question('Method [GET]: ') || 'GET'
    let body = await question('Body JSON [kosongkan jika GET]: ')

    const duration = await question('Durasi detik [30]: ') || 30
    const connections = await question('Jumlah Koneksi [20]: ') || 20
    const rps = await question('Pipelining/RPS per koneksi [10]: ') || 10

    rl.close()

    // cek body kalau ada
    let payload = undefined
    let headers = {}
    if (body.trim()!== '') {
        try {
            JSON.parse(body) // validasi json
            payload = body
            headers['content-type'] = 'application/json'
        } catch {
            console.log('\x1b[31mBody bukan JSON valid. Kirim sebagai text biasa\x1b[0m')
            payload = body
        }
    }

    console.log(`\n\x1b[32mMulai test ke: ${target}\x1b[0m`)
    console.log(`Method: ${method} | Koneksi: ${connections} | Durasi: ${duration}s | Pipelining: ${rps}\n`)

    const instance = autocannon({
        url: target,
        method: method.toUpperCase(),
        body: payload,
        headers: headers,
        connections: parseInt(connections),
        duration: parseInt(duration),
        pipelining: parseInt(rps),
        timeout: 10,
        renderStatusCodes: true
    })

    autocannon.track(instance, {
        renderProgressBar: true,
        renderResultsTable: true
    })

    instance.on('done', (result) => {
        console.log('\n\x1b[32m=== HASIL AKHIR ===\x1b[0m')
        console.log(`Target: ${result.url}`)
        console.log(`Total Requests: ${result.requests.total}`)
        console.log(`RPS Avg: ${result.requests.average}`)
        console.log(`Latency Avg: ${result.latency.average.toFixed(2)} ms`)
        console.log(`Throughput: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`)
        console.log(`2xx: ${result['2xx']} 4xx: ${result['4xx']} 5xx: ${result['5xx']}`)
        console.log(`Errors: ${result.errors} Timeouts: ${result.timeouts}`)
    })

    instance.on('error', err => console.error(err))
}

main()
