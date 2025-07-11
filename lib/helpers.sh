#!/usr/bin/env bash

# Common installer helper functions
# This file should be sourced by installer scripts

# Global timestamp for consistent backup naming
DATETIME=$(date +"%Y%m%d_%H%M%S")

# Global array to track backed up files
declare -a BACKED_UP_FILES=()

# Function to sync directory with backup using rsync
sync_directory() {
    local src_dir="$1"
    local dest_dir="$2"
    
    mkdir -p "$dest_dir"
    
    # Use rsync with backup, suppressing verbose output
    rsync -a --backup --suffix="__${DATETIME}.bk" "$src_dir/" "$dest_dir/"
    
    # Find all backup files created by rsync
    while IFS= read -r -d '' backup_file; do
        BACKED_UP_FILES+=("$backup_file")
    done < <(find "$dest_dir" -name "*__${DATETIME}.bk" -type f -print0 2>/dev/null || true)
}

# Function to copy single file with backup
copy_file_with_backup() {
    local src="$1"
    local dest="$2"
    
    mkdir -p "$(dirname "$dest")"
    
    # Use rsync for consistency
    rsync -a --backup --suffix="__${DATETIME}.bk" "$src" "$dest"
    
    # Check if backup was created
    local backup_path="${dest}__${DATETIME}.bk"
    if [[ -f "$backup_path" ]]; then
        BACKED_UP_FILES+=("$backup_path")
    fi
}

# Function to print installation header
print_installation_header() {
    local install_type="$1"
    local script_dir="$2"
    
    echo "Starting AI tooling ${install_type} installation..."
    echo "Script directory: $script_dir"
    if [[ "$install_type" == "project-level" ]]; then
        echo "Target directory: $(pwd)"
    fi
}

# Function to print installation footer
print_installation_footer() {
    local install_type="$1"
    
    echo ""
    echo "${install_type} installation complete!"
    
    # Print list of backed up files
    if [[ ${#BACKED_UP_FILES[@]} -gt 0 ]]; then
        echo ""
        echo "Files backed up:"
        for backup in "${BACKED_UP_FILES[@]}"; do
            echo "  - $backup"
        done
    else
        echo ""
        echo "No files were backed up (no conflicts found)."
    fi
}

# Function to install directory with optional check
install_directory() {
    local src_dir="$1"
    local dest_dir="$2"
    local description="$3"
    
    if [[ -d "$src_dir" ]]; then
        echo "$description"
        sync_directory "$src_dir" "$dest_dir"
    else
        echo "Warning: $src_dir directory not found"
    fi
}

# Function to install file with optional check
install_file() {
    local src_file="$1"
    local dest_file="$2"
    local description="$3"
    local make_executable="${4:-false}"
    
    if [[ -f "$src_file" ]]; then
        echo "$description"
        copy_file_with_backup "$src_file" "$dest_file"
        if [[ "$make_executable" == "true" ]]; then
            chmod +x "$dest_file"
        fi
    else
        echo "Warning: $src_file not found"
    fi
}

# Function to install CLAUDE.md with XML tag handling
install_claude_md() {
    local src_file="$1"
    local dest_file="$2"
    local description="$3"
    local xml_tag="${4:-user-level-instructions}"
    
    if [[ ! -f "$src_file" ]]; then
        echo "Warning: $src_file not found"
        return 1
    fi
    
    echo "$description"
    
    # Create destination directory if it doesn't exist
    mkdir -p "$(dirname "$dest_file")"
    
    # If destination file doesn't exist, simply copy the source
    if [[ ! -f "$dest_file" ]]; then
        cp "$src_file" "$dest_file"
        return 0
    fi
    
    # Check if destination file contains the specified XML tag
    if grep -q "<${xml_tag}>" "$dest_file"; then
        # Create backup
        local backup_path="${dest_file}__${DATETIME}.bk"
        cp "$dest_file" "$backup_path"
        BACKED_UP_FILES+=("$backup_path")
        
        # Replace the existing XML tag section
        # Use sed to delete everything between and including the tags, then append new content
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "/<${xml_tag}>/,/<\/${xml_tag}>/d" "$dest_file"
        else
            sed -i "/<${xml_tag}>/,/<\/${xml_tag}>/d" "$dest_file"
        fi
        cat "$src_file" >> "$dest_file"
    else
        # Create backup
        local backup_path="${dest_file}__${DATETIME}.bk"
        cp "$dest_file" "$backup_path"
        BACKED_UP_FILES+=("$backup_path")
        
        # Append the new content to the existing file
        cat "$src_file" >> "$dest_file"
    fi
}