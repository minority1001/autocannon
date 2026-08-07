const autocannon = require('autocannon')
const readline = require('readline')
const fs = require('fs')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (q) => new Promise(resolve => rl.question(q, resolve))

async function main() {
    console.log('\x1b[36m=== AUTOCANNON V4 - SUPPORT ALL METHOD ===\x1b[0m\n')

    const target = await question('Target URL: ')
    const method = await question('Method [GET]: ') || 'GET'
    let body = await question('Body JSON [kosongkan jika GET]: ')
    let headerInput = await question('Header custom? format: key:val,key2:val2 [kosongkan]: ')

    const duration = await question('Durasi detik [30]: ') || 30
    const connections = await question('Jumlah Koneksi [20]: ') || 20
    const rps = await question('Pipelining/RPS per koneksi [10]: ') || 10
    const saveCSV = await question('Simpan ke CSV? y/n [n]: ') || 'n'

    rl.close()

    // Parse Body
    let payload = undefined
    let headers = {}
    if (body.trim()!== '') {
        try {
            JSON.parse(body)
            payload = body
            headers['content-type'] = 'application/json'
        } catch {
            payload = body
            headers['content-type'] = 'text/plain'
        }
    }

    // Parse Header Custom
    if(headerInput.trim()!== ''){
        headerInput.split(',').forEach(h => {
            const [k,v] = h.split(':')
            if(k && v) headers[k.trim()] = v.trim()
        })
    }

    console.log(`\n\x1b[32mMulai test ke: ${target}\x1b[0m`)
    console.log(`Method: ${method.toUpperCase()} | Koneksi: ${connections} | Durasi: ${duration}s | Pipelining: ${rps}`)
    console.log(`Headers:`, headers, '\n')

    const statusCodes = {}
    const errors = {}

    const instance = autocannon({
        url: target,
        method: method.toUpperCase(),
        body: payload,
        headers: headers,
        connections: parseInt(connections),
        duration: parseInt(duration),
        pipelining: parseInt(rps),
        timeout: 30,
        ignoreErrors: true
    })

    instance.on('response', (client, statusCode) => {
        statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1
    })

    instance.on('error', (err) => {
        errors[err.code] = (errors[err.code] || 0) + 1
    })

    autocannon.track(instance)

    instance.on('done', (result) => {
        console.log('\n\x1b[32m=== HASIL AKHIR ===\x1b[0m')
        console.log(`Total Requests: ${result.requests.total}`)
        console.log(`RPS Avg: ${result.requests.average}`)
        console.log(`Latency Avg: ${result.latency.average.toFixed(2)} ms`)
        console.log(`Throughput: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`)
        console.log(`Errors: ${result.errors} Timeouts: ${result.timeouts}`)

        console.log('\n\x1b[33m=== STATUS CODE ===\x1b[0m')
        Object.keys(statusCodes).sort().forEach(code => console.log(` ${code}: ${statusCodes[code]}`))

        if(Object.keys(errors).length > 0){
            console.log('\n\x1b[31m=== ERROR TYPE ===\x1b[0m')
            Object.keys(errors).forEach(e => console.log(` ${e}: ${errors[e]}`))
        }

        if (saveCSV.toLowerCase() === 'y') {
            const csv = `stat,value\nTotal Requests,${result.requests.total}\nRPS Avg,${result.requests.average}\nLatency Avg,${result.latency.average}\n` + Object.keys(statusCodes).map(k => `${k},${statusCodes[k]}`).join('\n')
            fs.writeFileSync('hasil-loadtest.csv', csv)
            console.log('\n\x1b[32mTersimpan: hasil-loadtest.csv\x1b[0m')
        }
    })
}
main()
