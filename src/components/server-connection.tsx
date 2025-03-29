<Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90"
              disabled={connectServerMutation?.isPending || false}
            >
              {connectServerMutation?.isPending ? (