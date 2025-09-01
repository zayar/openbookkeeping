package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

func main() {
	// Test DSN parsing
	dsn := "cashflowadmin:C%40shflow132@tcp(10.22.96.3:3306)/cashflowdb?parseTime=true"
	
	fmt.Printf("Testing DSN: %s\n", dsn)
	
	// Try to parse the DSN by opening a connection
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Failed to parse DSN: %v", err)
	}
	
	// Test the connection
	err = db.Ping()
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	
	fmt.Println("DSN parsing and connection successful!")
	
	// Close the connection
	db.Close()
}
