#!/usr/bin/env bash

set -euo pipefail

choose_mode() {
    echo "Select mode:"
    select selected_mode in "fork" "unfork" "cancel"; do
        case "$selected_mode" in
            fork|unfork)
                MODE="$selected_mode"
                return
                ;;
            cancel)
                echo "Canceled."
                exit 0
                ;;
            *)
                echo "Invalid choice. Enter 1, 2, or 3."
                ;;
        esac
    done
}

read_unfork_version() {
    read -r -p "Enter target version for unfork (e.g. 1.2.3): " TARGET_VERSION
    if [[ -z "$TARGET_VERSION" ]]; then
        echo "Version is required for unfork mode."
        exit 1
    fi
}

process_files() {
    if [[ "$MODE" == "fork" ]]; then
        # 1) epam/ai-dial-ci + line ending with @*.*.* -> @main
        find . -type f -not -path "./.git/*" -not -name "fork.sh" -not -name "README.md" \
            -exec sed -E -i '/epam\/ai-dial-ci/ s/@[^[:space:]@]*\.[^[:space:]@]*\.[^[:space:]@]*$/@main/' {} +

        # 2) epam/ai-dial-ci -> nepalevov/ci
        find . -type f -not -path "./.git/*" -not -name "fork.sh" \
            -exec sed -i 's#epam/ai-dial-ci#nepalevov/ci#g' {} +
    else
        # 1) @main -> @<version>
        find . -type f -not -path "./.git/*" -not -name "fork.sh" -not -name "README.md" \
            -exec sed -i "s#@main#@${TARGET_VERSION}#g" {} +

        # 2) nepalevov/ci -> epam/ai-dial-ci
        find . -type f -not -path "./.git/*" -not -name "fork.sh" \
            -exec sed -i 's#nepalevov/ci#epam/ai-dial-ci#g' {} +
    fi

    echo "Mode: $MODE"
    if [[ "$MODE" == "unfork" ]]; then
        echo "Version applied: $TARGET_VERSION"
    fi
    echo "Done. Review changes with: git diff"
}

main() {
    choose_mode

    if [[ "$MODE" == "unfork" ]]; then
        read_unfork_version
    fi

    process_files
}

main "$@"
