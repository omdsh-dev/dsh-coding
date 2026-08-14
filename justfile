default:
    just --list

dep:
    pnpm install 

dev *args:
    deepseek-harness-desktop dev {{ args }} .

plugin *args:
    deepseek-harness-desktop plugin {{ args }} 

bundle *args:
    deepseek-harness-desktop bundle {{ args }} .

clean:
    rm -rf node_modules
