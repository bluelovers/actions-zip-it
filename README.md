
```yaml
      -
         name: actions-zip-it
         uses: bluelovers/actions-zip-it@v1.0.1
         with:
            paths: |
               output/wildcards/*.yaml
            outputFile: output/test-actions.zip
            autoCreateOutputDir: 1
```
