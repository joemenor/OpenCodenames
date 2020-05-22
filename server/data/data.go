package data

import (
	"bufio"
	"io/ioutil"
	"log"
	"os"
	"sync"
)

type WordList []string

var (
	wordListOnce     sync.Once
	recaptchaKeyOnce sync.Once
	instance         WordList
	recaptchaKey     string
)

func GetWordList() WordList {
	wordListOnce.Do(func() {
		file, err := os.Open("./data/wordlist.txt")
		if err != nil {
			log.Fatal(err)
		}
		defer file.Close()
		scanner := bufio.NewScanner(file)
		instance = make([]string, 0)
		for scanner.Scan() {
			instance = append(instance, scanner.Text())
		}
		if err := scanner.Err(); err != nil {
			log.Fatal(err)
		}

	})
	return instance
}

// GetReCAPTCHAKey returns the token necessary to check ReCAPTCHA tests
func GetReCAPTCHAKey() string {
	recaptchaKeyOnce.Do(func() {
		key, err := ioutil.ReadFile("./recaptcha-key.txt")
		if err != nil {
			log.Fatal(err)
		}
		recaptchaKey = string(key)
	})
	return recaptchaKey
}
