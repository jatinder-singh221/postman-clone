import React, { useState, useCallback } from 'react'

const App = () => {
  const [calling, setCalling] = useState(false)
  const [tab, setTab] = useState('headers')
  const [request, setRequest] = useState({
    method: "GET",
    url: "",
    body: null,
  })
  const [headers, setHeaders] = useState([
    { id: 1, header: 'Accept', value: '*/*' }
  ])
  const [fields, setFields] = useState([
    { id: 1, name: '', value: '' }
  ])
  const [binary, setBinary] = useState<File | null>(null)
  const [jsonBody, setJsonBody] = useState("")
  const [response, setResponse] = useState<any>({
    status: null,
    text: null,
    headers: null
  })

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRequest(pre => ({ ...pre, [name]: value }))
  }, [])

  const update = useCallback((type: "header" | "field", id: number, field: string, newValue: string) => {
    if (type === 'header') {
      setHeaders((prev) =>
        prev.map((h) => (h.id === id ? { ...h, [field]: newValue } : h))
      )
    } else {
      setFields((prev) =>
        prev.map((f) => (f.id === id ? { ...f, [field]: newValue } : f))
      )
    }
  }, [])

  const addRemovelist = useCallback((type: "header" | "field", id?: number) => {
    if (type === 'header') {
      if (id !== undefined)
        setHeaders((prev) => prev.filter((h) => h.id !== id))
      else
        setHeaders((pre) => [...pre, { id: Date.now(), header: "", value: "" }])
    } else {
      if (id !== undefined)
        setFields((prev) => prev.filter((f) => f.id !== id))
      else
        setFields((pre) => [...pre, { id: Date.now(), name: "", value: "" }])
    }
  }, [])

  // ---- Build Request ----
  const buildRequest = () => {
    setCalling(true)
    const headersObj: Record<string, string> = {}
    headers.forEach(h => {
      if (h.header && h.value) headersObj[h.header] = h.value
    })

    let body: BodyInit | undefined = undefined

    // Only attach body if method allows it
    if (!["GET", "HEAD"].includes(request.method.toUpperCase())) {
      if (jsonBody.trim()) {
        headersObj["Content-Type"] = "application/json"
        body = jsonBody
      } else if (fields.some(f => f.name) || binary) {
        const formData = new FormData()
        fields.forEach(f => {
          if (f.name) formData.append(f.name, f.value)
        })
        if (binary) {
          formData.append("file", binary) // 👈 binary as form-data
        }
        body = formData
      }
    }

    return {
      method: request.method,
      headers: headersObj,
      Credentials: "include",
      body, // will be undefined for GET/HEAD
    }
  }


  // ---- Send Request ----
  const sendRequest = async () => {
    try {
      const options = buildRequest()
      const res = await fetch(request.url, options)
      const text = await res.text()

      const responseHeadersObj: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        responseHeadersObj[key] = value
      })


      setResponse({
        status: res.status,
        text: text,
        headers: responseHeadersObj
      })
      setCalling(false)
      setTab('response') // auto-switch to response tab
    } catch (err: any) {
      setCalling(false)
      setResponse(`Error: ${err.message}`)
      setTab('response')
    }
  }

  return (
    <section>
      <form className='m-4 flex flex-row border items-center'>
        <select
          className="select select-ghost p-2 border-0 focus:outline-0 w-full max-w-24"
          name='method'
          value={request.method}
          onChange={handleChange}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>

        <input
          type="text"
          placeholder="Enter url"
          className="input input-ghost w-full px-2 border-0 focus:outline-0"
          name='url'
          value={request.url}
          onChange={handleChange}
          required
        />
        <button
          type='button'
          className="btn btn-primary btn-sm mr-2"
          onClick={sendRequest}
          disabled={calling}
        >
          {calling ? <span className="loading loading-spinner loading-xs"></span> : 'send'}
        </button>
      </form>

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-boxed mx-2 tabs-md">

        {/* Headers */}
        <a role="tab" className={`tab ${tab === 'headers' ? 'tab-active' : ''}`} onClick={() => setTab('headers')}>Headers</a>
        <div role="tabpanel" className="tab-content p-5">
          <p>HTTP Headers</p>
          {headers.map((header, index) =>
            <div key={index} className="flex flex-row items-center space-x-6 my-2">
              <input type="text" placeholder="header" className="input w-full input-sm"
                value={header.header}
                onChange={(e) => update("header", header.id, "header", e.target.value)}
              />
              <input type="text" placeholder="value" className="input w-full input-sm"
                value={header.value}
                onChange={(e) => update("header", header.id, "value", e.target.value)}
              />
              {headers.length > 1 && <button type='button' className='btn btn-square btn-sm btn-error' onClick={() => addRemovelist("header", header.id)}>X</button>}
            </div>
          )}
          <div className="flex justify-end">
            <button type='button' className='btn btn-square btn-sm btn-primary' onClick={() => addRemovelist("header")}>+</button>
          </div>
        </div>

        {/* Body */}
        <a role="tab" className={`tab ${tab === 'body' ? 'tab-active' : ''}`} onClick={() => setTab('body')}>Body</a>
        <div role="tabpanel" className="tab-content p-5">
          <div className="flex w-full flex-col space-y-3">
            <p>JSON Content</p>
            <div className="card bg-base-300 rounded-box">
              <textarea
                className="textarea textarea-bordered textarea-lg text-sm"
                rows={5}
                value={jsonBody}
                onChange={(e) => setJsonBody(e.target.value)}
              ></textarea>
            </div>

            <div className="divider"></div>
            <p>Form Fields</p>
            <div className="card bg-base-300 rounded-box p-5">
              {fields.map((field, index) =>
                <div key={index} className="flex flex-row items-center space-x-6 my-2">
                  <input type="text" placeholder="name" className="input w-full input-sm"
                    value={field.name}
                    onChange={(e) => update("field", field.id, "name", e.target.value)}
                  />
                  <input type="text" placeholder="value" className="input w-full input-sm"
                    value={field.value}
                    onChange={(e) => update("field", field.id, "value", e.target.value)}
                  />
                  {fields.length > 1 && <button type='button' className='btn btn-square btn-sm btn-error' onClick={() => addRemovelist("field", field.id)}>X</button>}
                </div>
              )}
              <div className="flex justify-end">
                <button type='button' className='btn btn-square btn-sm btn-primary' onClick={() => addRemovelist("field")}>+</button>
              </div>
            </div>

            <div className="divider"></div>
            <p>Binary File</p>
            <div className="card bg-base-300 rounded-box p-5">
              <input
                type="file"
                onChange={(e: any) => setBinary(e.target.files[0])}
                className="file-input w-full max-w-xs file-input-sm"
              />
            </div>
          </div>
        </div>

        {/* Response */}
        <a role="tab" className={`tab ${tab === 'response' ? 'tab-active' : ''}`} onClick={() => setTab('response')}>Response</a>
        <div role="tabpanel" className="tab-content p-5 space-y-4">
          <p>Status: {response.status}</p>
          <div className="flex w-full flex-col">
            <p className='text-primary'>Response</p>
            <div className="card bg-base-300 rounded-box max-h-56 overflow-y-auto min-h-56">
              <pre className="whitespace-pre-wrap p-4">{response.text}</pre>
            </div>
            <div className="divider"></div>
            <p className='text-primary'>Headers</p>
            <div className="card bg-base-300 rounded-box max-h-56 min-h-56 p-4 overflow-y-auto">
              <ul className='list space-y-2'>
                {response?.headers && Object.entries(response?.headers).map(([key, value]) => (
                  <li key={key} className='list-row'>
                    <strong>{key}</strong>: {String(value)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default App
