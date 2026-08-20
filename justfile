default:
    just --list

dep:
    pnpm install 

clean:
    rm -rf pnpm-lock.yaml
    rm -rf node_modules/

dev *args:
    dsh-web-desktopify dev {{ args }} .

plugin *args:
    dsh-web-desktopify plugin {{ args }} 

bundle *args:
    dsh-web-desktopify bundle {{ args }} .
