
SUBDIRS = engine shared frontend
dist_sources = package.json main.js platform.js thingengine-server.service.in device_discovery.js
version = 1.0.0
pwd := $(shell pwd)

# Builds for local testing only
# To build for packaging, see Makefile.distro
all: platform_config.js
	make -C frontend all
	npm install
	npm dedupe

platform_config.js:
	echo "exports.PKGLIBDIR = '$(pwd)'; exports.LOCALSTATEDIR = '.';" > platform_config.js

clean:
	make -C engine clean
	make -C frontend clean
	#rm -fr node_modules/
	rm -f platform_config.js

# Note the / after $$d, forces symlink resolution
dist: clean
	rm -fr thingengine-server-$(version)/
	mkdir thingengine-server-$(version)/
	cp -pr debian/ thingengine-server-$(version)/
	for d in $(SUBDIRS) ; do cp -pr $$d/ thingengine-server-$(version)/ ; done
	cp -pr Makefile.distro thingengine-server-$(version)/Makefile
	cp -pr $(dist_sources) thingengine-server-$(version)/
	tar czf thingengine-server-$(version).tar.gz thingengine-server-$(version)/
	rm -fr thingengine-server-$(version)/

# Note the / after engine, forces symlink resolution
build-debian-src: dist
	tar xf thingengine-server-$(version).tar.gz
	cd thingengine-server-$(version)/ ; debuild -S
	rm -fr thingengine-server-$(version)/

rpmdefines = \
	--define "_version $(version)" \
	--define "_sourcedir $(pwd)" \
	--define "_specdir $(pwd)/fedora" \
	--define "_builddir $(pwd)/fedora" \
	--define "_srcrpmdir $(pwd)/fedora" \
	--define "_rpmdir $(pwd)/fedora"

build-fedora-src: dist
	rpmbuild $(rpmdefines) -bs fedora/thingengine-server.spec

build-fedora: dist
	rpmbuild $(rpmdefines) -ba fedora/thingengine-server.spec
