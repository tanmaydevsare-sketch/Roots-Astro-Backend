import sys
import hashlib

def check_duplicates(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Check for large repeating blocks (e.g. 50 lines)
    block_size = 50
    seen_blocks = {}
    
    for i in range(len(lines) - block_size):
        block = "".join(lines[i:i+block_size])
        block_hash = hashlib.md5(block.encode('utf-8')).hexdigest()
        
        if block_hash in seen_blocks:
            print(f"DUPLICATE BLOCK DETECTED!")
            print(f"Original: lines {seen_blocks[block_hash][0]}-{seen_blocks[block_hash][0]+block_size}")
            print(f"Duplicate: lines {i}-{i+block_size}")
            print("-" * 20)
            seen_blocks[block_hash].append(i)
        else:
            seen_blocks[block_hash] = [i]

if __name__ == "__main__":
    check_duplicates(r'frontend\src\index.css')
