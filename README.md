# RefreshRedirector

🔁 HTTP proxy to turn `http-equiv="refresh"` into 301

<table align=center><td>

<div><code>https://octocat.github.io/awesome/index.html</code></div>

```html
<meta
  name="go-import"
  content="
    octocat.github.io/awesome
    mod
    https://refreshredirector.jcbhmr.com/https://octocat.github.io/awesome/goproxy
  "
/>
```

<div><code>https://octocat.github.io/awesome/goproxy/octocat.github.io/awesome/@v/v1.2.3.zip</code></div>

```html
<!-- ⭐ 'go get' will see a 301 redirect since it's proxied through RefreshRedirector. -->
<meta
  http-equiv="refresh"
  content="0; URL=https://github.com/octocat/awesome/releases/download/v1.2.3/v1.2.3.zip"
/>
```

</table>

## Installation

ℹ These are the instructions to self-host RefreshRedirector. You're probably looking for the [Usage](#usage) instructions below.

The `jsr:@jcbhmr/refreshredirector` package exports a ready-to-deploy HTTP handler that works great on [Deno Deploy](https://deno.com/deploy).

1. Sign in to Deno Deploy at https://dash.deno.com/login
2. Create a new Deno Deploy playground
3. `export { default } from "jsr:@jcbhmr/refreshredirector"`
4. Click "Deploy" 🎉

You can also run it locally using `deno serve`:

```sh
deno serve jsr:@jcbhmr/refreshredirector
```

## Usage

**Primary use case:** Hosting a bare-bones GOPROXY on GitHub Pages that can redirect the big `$base/$module/@v/$version.zip` 100+ MB zip file download to a GitHub release artifact instead of a GitHub Pages file

Real-world examples:

- https://github.com/jcbhmr/go-zig
